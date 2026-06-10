import { NextResponse } from "next/server";
import { buildProgressSheetRangeValues } from "@/lib/excel/exporter";
import { syncDataSheetValues } from "@/lib/google/sheets";
import type { AppData } from "@/types/domain";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<NextResponse> => {
  try {
    const data = (await request.json()) as Partial<AppData>;
    if (!data.tasks || !data.progress) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu tasks/progress để sync Google Sheet." },
        { status: 400 }
      );
    }

    const rangeValues = buildProgressSheetRangeValues(data as AppData);
    const result = await syncDataSheetValues(rangeValues.values, {
      clearRange: rangeValues.clearRange,
      updateRange: rangeValues.range
    });
    return NextResponse.json({
      ok: true,
      range: rangeValues.clearRange,
      ...result
    });
  } catch (error) {
    console.error("[api/google-sheets/sync-data]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không sync được Google Sheet DATA."
      },
      { status: 500 }
    );
  }
};
