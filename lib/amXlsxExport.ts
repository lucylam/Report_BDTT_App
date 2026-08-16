import {
  type AmActivity,
  getAmStatusMeta,
  getAssigneeNames
} from "@/lib/amActivity";
import type { Profile } from "@/types/domain";

type ReportPerson = Pick<Profile, "id" | "fullName">;

interface ZipEntry {
  readonly path: string;
  readonly data: Uint8Array;
}

interface ParsedImage {
  readonly bytes: Uint8Array;
  readonly extension: "jpeg" | "png";
  readonly contentType: "image/jpeg" | "image/png";
}

interface WorkbookImage {
  readonly image: ParsedImage;
  readonly rowIndex: number;
  readonly colIndex: number;
  readonly photoIndex: number;
  readonly photosInCell: number;
  readonly name: string;
}

const MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const EMU_PER_PIXEL = 9525;
const PHOTO_CELL_WIDTH_PX = 250;
const PHOTO_CELL_HEIGHT_PX = 230;
const PHOTO_PADDING_PX = 10;
const PHOTO_GAP_PX = 8;

const textEncoder = new TextEncoder();

const encodeText = (value: string): Uint8Array => textEncoder.encode(value);

const xmlEscape = (value: string | number): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const createCrcTable = (): Uint32Array => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
};

const CRC_TABLE = createCrcTable();

const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  data.forEach((byte) => {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint16 = (view: DataView, offset: number, value: number): void => {
  view.setUint16(offset, value, true);
};

const writeUint32 = (view: DataView, offset: number, value: number): void => {
  view.setUint32(offset, value, true);
};

const concatBytes = (chunks: readonly Uint8Array[]): Uint8Array => {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
};

const buildZip = (entries: readonly ZipEntry[]): Uint8Array => {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let localOffset = 0;

  entries.forEach((entry) => {
    const fileName = encodeText(entry.path);
    const checksum = crc32(entry.data);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, entry.data.length);
    writeUint32(localView, 22, entry.data.length);
    writeUint16(localView, 26, fileName.length);
    writeUint16(localView, 28, 0);
    localChunks.push(localHeader, fileName, entry.data);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, entry.data.length);
    writeUint32(centralView, 24, entry.data.length);
    writeUint16(centralView, 28, fileName.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);
    centralChunks.push(centralHeader, fileName);

    localOffset += localHeader.length + fileName.length + entry.data.length;
  });

  const centralDirectory = concatBytes(centralChunks);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, entries.length);
  writeUint16(endView, 10, entries.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, localOffset);
  writeUint16(endView, 20, 0);

  return concatBytes([...localChunks, centralDirectory, endRecord]);
};

const parseDataUrlImage = (dataUrl: string): ParsedImage | null => {
  const match = /^data:(image\/(?:jpeg|jpg|png));base64,([a-z0-9+/=]+)$/i.exec(
    dataUrl.trim()
  );
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return mime === "image/png"
    ? { bytes, extension: "png", contentType: "image/png" }
    : { bytes, extension: "jpeg", contentType: "image/jpeg" };
};

const columnLetter = (columnIndex: number): string => {
  let dividend = columnIndex;
  let name = "";
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return name;
};

const inlineStringCell = (
  column: number,
  row: number,
  value: string,
  style = 0
): string => {
  const reference = `${columnLetter(column)}${row}`;
  return `<c r="${reference}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
};

const numberCell = (
  column: number,
  row: number,
  value: number,
  style = 0
): string => {
  const reference = `${columnLetter(column)}${row}`;
  return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
};

const formatShortDate = (dateText: string): string => {
  const [year, month, day] = dateText.split("-");
  if (!year || !month || !day) return dateText;
  return `${day}-${month}-${year.slice(-2)}`;
};

const createNoteText = (activity: AmActivity): string => {
  const notes = [
    activity.performerNote.trim()
      ? `Người thực hiện: ${activity.performerNote.trim()}`
      : "",
    activity.supervisorNote.trim()
      ? `Giám sát: ${activity.supervisorNote.trim()}`
      : ""
  ].filter(Boolean);
  return notes.join("\n");
};

const createImageList = (activities: readonly AmActivity[]): WorkbookImage[] => {
  const images: WorkbookImage[] = [];
  activities.forEach((activity, activityIndex) => {
    const rowIndex = activityIndex + 2;
    activity.beforePhotos.slice(0, 4).forEach((photo, photoIndex) => {
      const image = parseDataUrlImage(photo.url);
      if (!image) return;
      images.push({
        image,
        rowIndex,
        colIndex: 5,
        photoIndex,
        photosInCell: Math.min(activity.beforePhotos.length, 4),
        name: `before-${activityIndex + 1}-${photoIndex + 1}`
      });
    });
    activity.afterPhotos.slice(0, 4).forEach((photo, photoIndex) => {
      const image = parseDataUrlImage(photo.url);
      if (!image) return;
      images.push({
        image,
        rowIndex,
        colIndex: 6,
        photoIndex,
        photosInCell: Math.min(activity.afterPhotos.length, 4),
        name: `after-${activityIndex + 1}-${photoIndex + 1}`
      });
    });
  });
  return images;
};

const getImageTile = (
  photoIndex: number,
  photosInCell: number
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } => {
  const columns = photosInCell <= 1 ? 1 : 2;
  const rows = Math.ceil(photosInCell / columns);
  const width =
    (PHOTO_CELL_WIDTH_PX - PHOTO_PADDING_PX * 2 - PHOTO_GAP_PX * (columns - 1)) /
    columns;
  const height =
    (PHOTO_CELL_HEIGHT_PX - PHOTO_PADDING_PX * 2 - PHOTO_GAP_PX * (rows - 1)) /
    rows;
  const col = photoIndex % columns;
  const row = Math.floor(photoIndex / columns);
  return {
    x: PHOTO_PADDING_PX + col * (width + PHOTO_GAP_PX),
    y: PHOTO_PADDING_PX + row * (height + PHOTO_GAP_PX),
    width,
    height
  };
};

const createWorksheetXml = (
  activities: readonly AmActivity[],
  profiles: readonly ReportPerson[],
  hasImages: boolean
): string => {
  const headers = [
    "Stt",
    "Nội dung yêu cầu",
    "Nhân sự thực hiện",
    "Ngày thực hiện",
    "Trạng thái",
    "Hình ảnh trước thực hiện",
    "Hình ảnh sau khi thực hiện",
    "Ghi chú"
  ];
  const headerCells = headers
    .map((header, index) => inlineStringCell(index + 1, 2, header, 2))
    .join("");
  const dataRows = activities
    .map((activity, index) => {
      const row = index + 3;
      const status = getAmStatusMeta(activity.status).label;
      const requestText = [activity.requestContent, activity.locationTag]
        .filter(Boolean)
        .join("\n");
      const assignees = getAssigneeNames(profiles, activity.assigneeIds).replace(
        /;\s*/g,
        "\n"
      );
      return `<row r="${row}" ht="176" customHeight="1">${[
        numberCell(1, row, index + 1, 3),
        inlineStringCell(2, row, requestText, 4),
        inlineStringCell(3, row, assignees, 4),
        inlineStringCell(4, row, formatShortDate(activity.scheduledDate), 3),
        inlineStringCell(5, row, status, 3),
        inlineStringCell(6, row, "", 3),
        inlineStringCell(7, row, "", 3),
        inlineStringCell(8, row, createNoteText(activity), 4)
      ].join("")}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="16"/>
  <cols>
    <col min="1" max="1" width="7" customWidth="1"/>
    <col min="2" max="2" width="34" customWidth="1"/>
    <col min="3" max="3" width="28" customWidth="1"/>
    <col min="4" max="4" width="15" customWidth="1"/>
    <col min="5" max="5" width="15" customWidth="1"/>
    <col min="6" max="7" width="34" customWidth="1"/>
    <col min="8" max="8" width="30" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="34" customHeight="1">${inlineStringCell(
      1,
      1,
      "XỬ LÝ TPM TAG XƯỞNG AMO",
      1
    )}</row>
    <row r="2" ht="28" customHeight="1">${headerCells}</row>
    ${dataRows}
  </sheetData>
  <mergeCells count="1"><mergeCell ref="A1:H1"/></mergeCells>
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
  ${hasImages ? '<drawing r:id="rId1"/>' : ""}
</worksheet>`;
};

const createStylesXml = (): string => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Times New Roman"/></font>
    <font><b/><sz val="20"/><color rgb="FF002060"/><name val="Times New Roman"/></font>
    <font><b/><sz val="11"/><name val="Times New Roman"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFC8EAF6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" wrapText="1"/>
    </xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const createDrawingXml = (images: readonly WorkbookImage[]): string => {
  const anchors = images
    .map((workbookImage, index) => {
      const tile = getImageTile(workbookImage.photoIndex, workbookImage.photosInCell);
      return `<xdr:oneCellAnchor>
  <xdr:from>
    <xdr:col>${workbookImage.colIndex}</xdr:col>
    <xdr:colOff>${Math.round(tile.x * EMU_PER_PIXEL)}</xdr:colOff>
    <xdr:row>${workbookImage.rowIndex}</xdr:row>
    <xdr:rowOff>${Math.round(tile.y * EMU_PER_PIXEL)}</xdr:rowOff>
  </xdr:from>
  <xdr:ext cx="${Math.round(tile.width * EMU_PER_PIXEL)}" cy="${Math.round(
        tile.height * EMU_PER_PIXEL
      )}"/>
  <xdr:pic>
    <xdr:nvPicPr>
      <xdr:cNvPr id="${index + 1}" name="${xmlEscape(workbookImage.name)}"/>
      <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>
    </xdr:nvPicPr>
    <xdr:blipFill>
      <a:blip r:embed="rId${index + 1}"/>
      <a:stretch><a:fillRect/></a:stretch>
    </xdr:blipFill>
    <xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
  </xdr:pic>
  <xdr:clientData/>
</xdr:oneCellAnchor>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}</xdr:wsDr>`;
};

const createDrawingRelsXml = (images: readonly WorkbookImage[]): string => {
  const relationships = images
    .map(
      (workbookImage, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${index + 1}.${workbookImage.image.extension}"/>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`;
};

const createContentTypesXml = (images: readonly WorkbookImage[]): string => {
  const hasJpeg = images.some((item) => item.image.extension === "jpeg");
  const hasPng = images.some((item) => item.image.extension === "png");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasJpeg ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : ""}
  ${hasPng ? '<Default Extension="png" ContentType="image/png"/>' : ""}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${
    images.length > 0
      ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
      : ""
  }
</Types>`;
};

const createWorkbookXml = (): string => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Bao cao AM" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const createRootRelsXml = (): string => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const createWorkbookRelsXml = (): string => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const createSheetRelsXml = (): string => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;

export const buildAmReportWorkbookBytes = (
  activities: readonly AmActivity[],
  profiles: readonly ReportPerson[]
): Uint8Array => {
  const images = createImageList(activities);
  const entries: ZipEntry[] = [
    { path: "[Content_Types].xml", data: encodeText(createContentTypesXml(images)) },
    { path: "_rels/.rels", data: encodeText(createRootRelsXml()) },
    { path: "xl/workbook.xml", data: encodeText(createWorkbookXml()) },
    { path: "xl/_rels/workbook.xml.rels", data: encodeText(createWorkbookRelsXml()) },
    {
      path: "xl/worksheets/sheet1.xml",
      data: encodeText(createWorksheetXml(activities, profiles, images.length > 0))
    },
    { path: "xl/styles.xml", data: encodeText(createStylesXml()) }
  ];

  if (images.length > 0) {
    entries.push(
      { path: "xl/worksheets/_rels/sheet1.xml.rels", data: encodeText(createSheetRelsXml()) },
      { path: "xl/drawings/drawing1.xml", data: encodeText(createDrawingXml(images)) },
      {
        path: "xl/drawings/_rels/drawing1.xml.rels",
        data: encodeText(createDrawingRelsXml(images))
      },
      ...images.map((workbookImage, index) => ({
        path: `xl/media/image${index + 1}.${workbookImage.image.extension}`,
        data: workbookImage.image.bytes
      }))
    );
  }

  return buildZip(entries);
};

export const buildAmReportWorkbookBlob = (
  activities: readonly AmActivity[],
  profiles: readonly ReportPerson[]
): Blob => {
  const bytes = buildAmReportWorkbookBytes(activities, profiles);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  return new Blob([buffer], { type: MIME_TYPE });
};

const fetchPhotoAsDataUrl = async (url: string): Promise<string> => {
  if (url.startsWith("data:")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không tải được ảnh để xuất Excel.");
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;
};

const hydrateReportPhotos = async (
  activities: readonly AmActivity[]
): Promise<AmActivity[]> =>
  Promise.all(
    activities.map(async (activity) => ({
      ...activity,
      beforePhotos: await Promise.all(
        activity.beforePhotos.map(async (photo) => ({
          ...photo,
          url: await fetchPhotoAsDataUrl(photo.url)
        }))
      ),
      afterPhotos: await Promise.all(
        activity.afterPhotos.map(async (photo) => ({
          ...photo,
          url: await fetchPhotoAsDataUrl(photo.url)
        }))
      )
    }))
  );

export const downloadAmReportWorkbook = async (
  activities: readonly AmActivity[],
  profiles: readonly ReportPerson[]
): Promise<void> => {
  const hydratedActivities = await hydrateReportPhotos(activities);
  const blob = buildAmReportWorkbookBlob(hydratedActivities, profiles);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bao-cao-am-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};
