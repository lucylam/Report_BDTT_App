export type SchedulePhase = "dung" | "bangiao" | "bdtt" | "khoidong";

export type ScheduleArea = "Tổng thể" | "Ammonia" | "Urê" | "Phụ trợ" | "Đường Gantt";

export interface ScheduleEvent {
  readonly p: SchedulePhase;
  readonly x: ScheduleArea;
  readonly c: string;
  readonly d: string;
  readonly h: string;
  readonly s: string;
  readonly n?: string;
  readonly bar?: string;
}

export const scheduleEvents: readonly ScheduleEvent[] = [

 // ===== TỔNG THỂ – DỪNG MÁY =====
 {p:'dung',x:'Tổng thể',c:'Amo + Urê',d:'2026-09-15',h:'09:00',s:'Amo, Urê bắt đầu giảm tải'},
 {p:'dung',x:'Tổng thể',c:'Urê',d:'2026-09-15',h:'09:00',s:'Urê dừng nạp liệu và tạo hạt'},
 {p:'dung',x:'Tổng thể',c:'04IS6',d:'2026-09-15',h:'16:00',s:'Amo kích hoạt 04IS6'},
 {p:'dung',x:'Tổng thể',c:'04IS7',d:'2026-09-15',h:'16:30',s:'Amo kích hoạt 04IS7'},
 {p:'dung',x:'Tổng thể',c:'R04203',d:'2026-09-15',h:'17:30',s:'Oxy hóa xúc tác R04203',n:'Kéo dài đến 13:30 ngày 16/09'},
 {p:'dung',x:'Tổng thể',c:'04IS1',d:'2026-09-16',h:'00:00',s:'Amo kích hoạt 04IS1',n:'Slide Xưởng Amo ghi 07:30 16/09'},
 {p:'dung',x:'Tổng thể',c:'04IS5',d:'2026-09-16',h:'07:30',s:'Kích hoạt 04IS5'},
 {p:'dung',x:'Tổng thể',c:'Boiler',d:'2026-09-16',h:'13:30',s:'Dừng Boiler'},
 {p:'dung',x:'Tổng thể',c:'Flare / NG',d:'2026-09-17',h:'08:00',s:'Dừng hệ thống đuốc và ngắt NG',n:'Kết thúc dừng máy — tổng 45–46 giờ'},

 // ===== AMMONIA – DỪNG MÁY (48,5 h) =====
 {p:'dung',x:'Ammonia',c:'Amo + Urê',d:'2026-09-15',h:'09:00',s:'START — Amo, Urê bắt đầu giảm tải'},
 {p:'dung',x:'Ammonia',c:'R04501 / E04501',d:'2026-09-15',h:'11:00',s:'Giảm nhiệt R04501 (−50°C/h); thử rò E04501',n:'+5h'},
 {p:'dung',x:'Ammonia',c:'04IS6, 04IS7',d:'2026-09-15',h:'16:00',s:'Amo kích hoạt 04IS6 và 04IS7'},
 {p:'dung',x:'Ammonia',c:'04I205',d:'2026-09-15',h:'17:30',s:'Bypass 04I205',n:'+1h'},
 {p:'dung',x:'Ammonia',c:'Cụm 200',d:'2026-09-15',h:'18:30',s:'40% tải, 750°C — Unload (−30°C/h)',n:'Mốc 900°C'},
 {p:'dung',x:'Ammonia',c:'R205',d:'2026-09-15',h:'19:30',s:'Purge R205 — đến 04:30 ngày 16/09',n:'+10h'},
 {p:'dung',x:'Ammonia',c:'CO2 / C04302',d:'2026-09-16',h:'00:30',s:'Dừng CO2 — giữ C04302 H2, HDS < 300°C',n:'−50°C/h'},
 {p:'dung',x:'Ammonia',c:'F04201',d:'2026-09-16',h:'07:00',s:'F201 450°C — ngắt NG',n:'+6h'},
 {p:'dung',x:'Ammonia',c:'HV2062',d:'2026-09-16',h:'07:30',s:'HV2062 block bleed, xoay bích mù nếu rò',n:'+1h · Nếu cụm van block bleed vào R04204 kín thì không xoay bích mù'},
 {p:'dung',x:'Ammonia',c:'R04203',d:'2026-09-16',h:'13:30',s:'Kết thúc oxy hóa xúc tác R04203',n:'+6h'},
 {p:'dung',x:'Ammonia',c:'B04201 / K04203',d:'2026-09-16',h:'14:00',s:'Khởi động B04201, K04203 làm nguội — đến 08:00',n:'Thử rò E04212A/B và E213'},
 {p:'dung',x:'Ammonia',c:'Cụm 200',d:'2026-09-16',h:'17:00',s:'Purge O2, mở block',n:'+3h'},
 {p:'dung',x:'Ammonia',c:'Flare',d:'2026-09-17',h:'00:00',s:'Phụ trợ dừng Flare',n:'+12h'},
 {p:'dung',x:'Ammonia',c:'Boiler',d:'2026-09-17',h:'08:00',s:'Phụ trợ dừng boiler — vào BDTT',n:'Tổng 48,5 giờ ≈ 2 ngày'},

 // ===== URÊ – DỪNG MÁY (41 h) =====
 {p:'dung',x:'Urê',c:'Tải',d:'2026-09-15',h:'09:00',s:'Bắt đầu giảm tải về 40%'},
 {p:'dung',x:'Urê',c:'Nạp liệu',d:'2026-09-15',h:'10:00',s:'Dừng nạp liệu, cô lập, rửa'},
 {p:'dung',x:'Urê',c:'K06101 / 06HV-1055',d:'2026-09-15',h:'11:00',s:'Dừng máy nén CO₂ — lắp bích mù trước 06HV-1055'},
 {p:'dung',x:'Urê',c:'R06101',d:'2026-09-15',h:'13:00',s:'Bắt đầu thải Reactor drain về 80 barg'},
 {p:'dung',x:'Urê',c:'06PV-1021B',d:'2026-09-15',h:'19:00',s:'Giảm áp cụm cao áp về 1 barg qua 06PV-1021B'},
 {p:'dung',x:'Urê',c:'Cụm cao áp',d:'2026-09-15',h:'22:00',s:'Purge hơi hệ thống cao áp'},
 {p:'dung',x:'Urê',c:'Cụm cao áp',d:'2026-09-16',h:'05:00',s:'Điền nước làm nguội hệ thống cao áp'},
 {p:'dung',x:'Urê',c:'Mạng hơi',d:'2026-09-16',h:'16:00',s:'Dừng mạng hơi'},
 {p:'dung',x:'Urê',c:'Turbine MN',d:'2026-09-16',h:'20:00',s:'Hoàn tất làm nguội turbine máy nén'},
 {p:'bangiao',x:'Urê',c:'Cụm cao áp',d:'2026-09-16',h:'22:00',s:'Bàn giao thiết bị cụm cao áp',n:'Giờ thứ ~36'},
 {p:'dung',x:'Urê',c:'Đuốc',d:'2026-09-17',h:'03:00',s:'Dừng đuốc — hoàn tất dừng máy',n:'Tổng 41 giờ'},

 // ===== PHỤ TRỢ – DỪNG MÁY =====
 {p:'dung',x:'Phụ trợ',c:'40000',d:'2026-09-14',h:'08:00',s:'Xả lỏng và purge NH3 bơm P40002'},
 {p:'dung',x:'Phụ trợ',c:'40000',d:'2026-09-15',h:'08:00',s:'Purge NH3 và xả methanol E40001'},
 {p:'dung',x:'Phụ trợ',c:'29000–41000',d:'2026-09-17',h:'00:00',s:'Dừng F29101, purge tuyến Fuel gas từ 41000 về 29000'},
 {p:'bangiao',x:'Phụ trợ',c:'29000–41000',d:'2026-09-17',h:'07:00',s:'Bàn giao F29101 mở Manhole; bàn giao B29101'},
 {p:'dung',x:'Phụ trợ',c:'41000',d:'2026-09-17',h:'07:00',s:'Purge toàn tuyến 41000'},
 {p:'bangiao',x:'Phụ trợ',c:'40000–51000',d:'2026-09-17',h:'07:00',s:'Bàn giao cụm 40000 BD'},
 {p:'dung',x:'Phụ trợ',c:'51000',d:'2026-09-17',h:'07:00',s:'Xả nước T51004 và purge hệ thống'},
 {p:'dung',x:'Phụ trợ',c:'29000',d:'2026-09-17',h:'10:00',s:'Dừng bơm BFW P29202A/B'},
 {p:'dung',x:'Phụ trợ',c:'20000',d:'2026-09-17',h:'10:00',s:'Dừng bơm Demi, xả nước bồn Demi',n:'Chạy bơm Deion P20204A/B cấp nước lên header Demi bằng đường bypass qua bồn'},
 {p:'bangiao',x:'Phụ trợ',c:'41000',d:'2026-09-17',h:'13:00',s:'Bàn giao cụm 41000, xoay bích mù van khí đầu nguồn và tuyến Permeate gas'},
 {p:'dung',x:'Phụ trợ',c:'97000',d:'2026-09-17',h:'13:00',s:'Lắp tấm chặn đầu kênh 97, dừng bơm P97001 khi mức T97001 thấp và bàn giao vệ sinh'},
 {p:'dung',x:'Phụ trợ',c:'21000',d:'2026-09-17',h:'13:00',s:'Xả bể Basin, bàn giao E21102, TĐN E21201A~J và khoang tháp Cooling E21101A-H'},
 {p:'bangiao',x:'Phụ trợ',c:'20000',d:'2026-09-17',h:'15:00',s:'Bàn giao bồn Demi tháo manhole'},
 {p:'dung',x:'Phụ trợ',c:'21000',d:'2026-09-17',h:'15:00',s:'Tháo manhole ống ngầm River, bàn giao các van bơm nước River'},
 {p:'dung',x:'Phụ trợ',c:'51000',d:'2026-09-17',h:'17:00',s:'Chèn bích Flare'},
 {p:'dung',x:'Phụ trợ',c:'21000',d:'2026-09-17',h:'17:00',s:'Lắp bơm chìm bơm cạn nước trong ống ngầm, quạt thông gió ống ngầm'},
 {p:'dung',x:'Phụ trợ',c:'40000–51000',d:'2026-09-17',h:'19:00',s:'Chèn bích mù T51004 và T51002'},
 {p:'dung',x:'Phụ trợ',c:'31000',d:'2026-09-17',h:'—',s:'Đổi nước làm mát Fresh sang nước thô trước khi dừng bơm Fresh'},
 {p:'bdtt',x:'Phụ trợ',c:'21000',d:'2026-09-18',h:'08:00',s:'Vệ sinh bể Basin'},
 {p:'bangiao',x:'Phụ trợ',c:'21000',d:'2026-09-21',h:'08:00',s:'Bàn giao ống ngầm để vệ sinh'},
 {p:'dung',x:'Phụ trợ',c:'31000',d:'2026-09-21',h:'XX:00',s:'Mở 31FV0135B, đóng 31FV0135A, xả áp header N2 và bàn giao'},
 {p:'dung',x:'Phụ trợ',c:'31000',d:'2026-09-21',h:'XX:00',s:'Cô lập xả áp header PA và IA để lắp Tie-in point, làm bypass bồn T31002',n:'Chưa có lịch dừng PA, IA, GAN'},

 // ===== BÀN GIAO / PSSR =====
 {p:'bangiao',x:'Phụ trợ',c:'Cụm Demi',d:'2026-09-21',h:'19:00',s:'Ưu tiên bàn giao cụm Demi (trước 19:00)'},
 {p:'bangiao',x:'Urê',c:'Xưởng Urê',d:'2026-09-24',h:'08:00',s:'Bàn giao Xưởng Urê'},
 {p:'bangiao',x:'Phụ trợ',c:'97000, 31000, 51000',d:'2026-09-24',h:'08:00',s:'Sẵn sàng chạy lại, purge O2 cụm 51.000 — final walkdown trước 08:00'},
 {p:'bangiao',x:'Ammonia',c:'Cụm 200',d:'2026-09-24',h:'12:00',s:'Bàn giao cụm 200 (chậm nhất)'},
 {p:'bangiao',x:'Phụ trợ',c:'29000, 41000',d:'2026-09-24',h:'15:30',s:'Bàn giao cụm 29.000 và 41.000 (chậm nhất)',n:'Phục vụ purge, thử kín, Gas in, đánh lửa đuốc, chạy Boiler'},
 {p:'bangiao',x:'Urê',c:'K06101',d:'2026-09-25',h:'08:00',s:'Bàn giao K06101'},
 {p:'bangiao',x:'Ammonia',c:'Cụm 300',d:'2026-09-25',h:'13:00',s:'Bàn giao cụm 300'},
 {p:'bangiao',x:'Ammonia',c:'Cụm 400, 500',d:'2026-09-25',h:'15:00',s:'Bàn giao cụm 400 và 500'},
 {p:'bangiao',x:'Urê',c:'Tạo hạt',d:'2026-09-25',h:'15:00',s:'Bàn giao cụm Tạo hạt'},
 {p:'bangiao',x:'Ammonia',c:'Cụm 700',d:'2026-09-26',h:'08:00',s:'Bàn giao cụm 700'},

 // ===== PHỤ TRỢ – CHẠY LẠI =====
 {p:'khoidong',x:'Phụ trợ',c:'20000',d:'2026-09-21',h:'22:00',s:'Chạy lại hệ thống sản xuất nước Demi'},
 {p:'khoidong',x:'Phụ trợ',c:'20000',d:'2026-09-22',h:'22:00',s:'Mức bồn Demi ~50%, chạy bơm Demi điền nước cho HT nước Fresh'},
 {p:'khoidong',x:'Phụ trợ',c:'40000',d:'2026-09-23',h:'09:00',s:'Hoàn thành purge oxi và điền lỏng làm lạnh các bơm NH3; đưa bơm về dự phòng'},
 {p:'khoidong',x:'Phụ trợ',c:'97000',d:'2026-09-24',h:'13:00',s:'Start P97001A/B/C điền nước bể Basin T21101'},
 {p:'khoidong',x:'Phụ trợ',c:'21000',d:'2026-09-24',h:'20:00',s:'Chạy bơm nước Fresh đầu tiên (1st)'},
 {p:'khoidong',x:'Phụ trợ',c:'21000',d:'2026-09-24',h:'21:00',s:'Đổi nước làm mát cụm 31000 và 40000 (Raw sang Fresh)'},
 {p:'khoidong',x:'Phụ trợ',c:'41000',d:'2026-09-25',h:'00:00',s:'Gas in 41000'},
 {p:'khoidong',x:'Phụ trợ',c:'51000',d:'2026-09-25',h:'01:00',s:'Đánh lửa Flare'},
 {p:'khoidong',x:'Phụ trợ',c:'29000',d:'2026-09-25',h:'02:00',s:'Start Boiler và sấy mạng hơi'},
 {p:'khoidong',x:'Phụ trợ',c:'21000',d:'2026-09-25',h:'20:00',s:'Chạy bơm nước sông đầu tiên (1st)'},
 {p:'khoidong',x:'Phụ trợ',c:'21000',d:'2026-09-25',h:'22:00',s:'Chạy bơm nước Fresh đầu tiên (1st)',n:'Trùng nội dung với mốc 20:00 ngày 24/09 — cần chốt lại'},
 {p:'khoidong',x:'Phụ trợ',c:'21000',d:'2026-09-26',h:'08:00',s:'Chạy bơm River và bơm Fresh thứ 2',n:'Thời gian chạy bơm, quạt làm mát có thể thay đổi theo tiến độ chạy máy'},
 {p:'khoidong',x:'Phụ trợ',c:'31000',d:'2026-09-25',h:'XX:00',s:'Điền áp T31001, cấp PA lên header; khởi động IA cấp lên header; mở 31FV0135A cấp Nitơ lên header GAN'},

 // ===== TỔNG THỂ – CHẠY LẠI (106,5 h) =====
 {p:'khoidong',x:'Tổng thể',c:'Gas in',d:'2026-09-25',h:'00:00',s:'Gas in và đánh lửa'},
 {p:'khoidong',x:'Tổng thể',c:'Primary Reformer',d:'2026-09-25',h:'08:00',s:'Đánh lửa Primary Reformer'},
 {p:'khoidong',x:'Tổng thể',c:'Boiler',d:'2026-09-26',h:'02:00',s:'Khởi động boiler',n:'Slide Phụ trợ và T20205 ghi 02:00 ngày 25/09'},
 {p:'khoidong',x:'Tổng thể',c:'K04421',d:'2026-09-26',h:'04:00',s:'Khởi động K04421'},
 {p:'khoidong',x:'Tổng thể',c:'Secondary',d:'2026-09-26',h:'06:00',s:'Đánh lửa Secondary'},
 {p:'khoidong',x:'Tổng thể',c:'LTS',d:'2026-09-26',h:'13:00',s:'Insert LTS'},
 {p:'khoidong',x:'Tổng thể',c:'R06101',d:'2026-09-26',h:'14:00',s:'Nạp liệu R06101'},
 {p:'khoidong',x:'Tổng thể',c:'K04441',d:'2026-09-26',h:'15:00',s:'Khởi động K04441'},
 {p:'khoidong',x:'Tổng thể',c:'K04431',d:'2026-09-26',h:'16:00',s:'Khởi động K04431',n:'Slide Xưởng Amo ghi 18:00'},
 {p:'khoidong',x:'Tổng thể',c:'Tạo hạt',d:'2026-09-26',h:'16:00',s:'Bắt đầu tạo hạt'},
 {p:'khoidong',x:'Tổng thể',c:'NH₃',d:'2026-09-27',h:'03:00',s:'Có sản phẩm NH3',n:'Slide Xưởng Amo ghi 05:00 · Tổng 106,5 giờ'},

 // ===== AMMONIA – CHẠY LẠI (48 h Amo / tổng 56 h) =====
 {p:'khoidong',x:'Ammonia',c:'Boiler',d:'2026-09-25',h:'00:00',s:'START — khởi động boiler'},
 {p:'khoidong',x:'Ammonia',c:'Gas in',d:'2026-09-25',h:'08:00',s:'Gas in và đánh lửa'},
 {p:'khoidong',x:'Ammonia',c:'F04201',d:'2026-09-25',h:'08:00',s:'Đánh lửa F04201',n:'30°C/h'},
 {p:'khoidong',x:'Ammonia',c:'Steam + NG',d:'2026-09-25',h:'23:00',s:'Steam + NG — 450°C',n:'+15h'},
 {p:'khoidong',x:'Ammonia',c:'K04421',d:'2026-09-26',h:'04:00',s:'Khởi động K04421',n:'50°C/h'},
 {p:'khoidong',x:'Ammonia',c:'Secondary',d:'2026-09-26',h:'06:00',s:'40% Load — đánh lửa Secondary',n:'700°C · 30°C/h'},
 {p:'khoidong',x:'Ammonia',c:'LTS',d:'2026-09-26',h:'13:00',s:'Insert LTS',n:'900°C · +7h'},
 {p:'khoidong',x:'Ammonia',c:'CO2',d:'2026-09-26',h:'14:00',s:'Đưa CO2'},
 {p:'khoidong',x:'Ammonia',c:'K04441',d:'2026-09-26',h:'15:00',s:'Khởi động K04441'},
 {p:'khoidong',x:'Ammonia',c:'Metan',d:'2026-09-26',h:'16:00',s:'Đưa Metan'},
 {p:'khoidong',x:'Ammonia',c:'K04431',d:'2026-09-26',h:'18:00',s:'Khởi động K04431'},
 {p:'khoidong',x:'Ammonia',c:'R04501',d:'2026-09-27',h:'03:00',s:'Heating R501',n:'50°C/h · +9h'},
 {p:'khoidong',x:'Ammonia',c:'NH₃',d:'2026-09-27',h:'05:00',s:'Có NH3',n:'+2h'},
 {p:'khoidong',x:'Ammonia',c:'ARU / HRU',d:'2026-09-27',h:'08:00',s:'ARU, HRU và offgas — FINISH',n:'+2–4h · Amo 48 giờ, tổng 56 giờ'},

 // ===== URÊ – CHẠY LẠI =====
 {p:'khoidong',x:'Urê',c:'HP loop',d:'2026-09-24',h:'17:00',s:'Điền nước demi vào HP loop, thử kín ~150 barg'},
 {p:'khoidong',x:'Urê',c:'Cụm trung áp',d:'2026-09-25',h:'04:00',s:'Thử kín cụm trung áp (nước 20 barg / N₂ 6 barg)'},
 {p:'khoidong',x:'Urê',c:'Cụm thấp áp',d:'2026-09-25',h:'14:00',s:'Thử kín và purge N₂ cụm thấp áp'},
 {p:'khoidong',x:'Urê',c:'Mạng hơi / đuốc',d:'2026-09-25',h:'17:00',s:'Đưa mạng hơi vào vận hành, khởi động đuốc'},
 {p:'khoidong',x:'Urê',c:'T06105',d:'2026-09-25',h:'19:00',s:'Nạp NH₃ và gia áp bồn T06105'},
 {p:'khoidong',x:'Urê',c:'HP loop / PCT',d:'2026-09-25',h:'21:00',s:'Gia nhiệt HP loop ~150°C (30°C/h), khởi động PCT'},
 {p:'khoidong',x:'Urê',c:'Cụm cao áp',d:'2026-09-26',h:'03:00',s:'Gia áp cụm cao áp 80–90 barg, chế dịch T06106'},
 {p:'khoidong',x:'Urê',c:'P06101',d:'2026-09-26',h:'04:00',s:'Khởi động bơm P06101'},
 {p:'khoidong',x:'Urê',c:'P06102 / Tạo hạt',d:'2026-09-26',h:'09:00',s:'Khởi động bơm P06102, chạy quạt cụm Tạo hạt'},
 {p:'khoidong',x:'Urê',c:'K06101 / R06101',d:'2026-09-26',h:'11:00',s:'Khởi động máy nén CO₂ K06101, nạp NH₃ và CO₂ vào R06101'},
 {p:'khoidong',x:'Urê',c:'Tạo hạt',d:'2026-09-26',h:'16:00',s:'Khởi động Tạo hạt — có sản phẩm urê'},

 // ===== ĐƯỜNG GANTT: E04502 =====
 {p:'dung',x:'Đường Gantt',c:'E04502',d:'2026-09-15',h:'10:00',s:'Giảm tải – dừng máy – cô lập hệ thống (đến 08:00 ngày 17/09)',bar:'2026-09-17T08:00'},
 {p:'bdtt',x:'Đường Gantt',c:'E04502',d:'2026-09-16',h:'18:00',s:'Thi công trước: cắt ống BFW 6", cắt ống SG 18" (đến 04:00 ngày 17/09)',bar:'2026-09-17T04:00'},
 {p:'bdtt',x:'Đường Gantt',c:'E04502',d:'2026-09-17',h:'08:00',s:'Tháo thiết bị (đến 05:00 ngày 18/09)',bar:'2026-09-18T05:00'},
 {p:'bdtt',x:'Đường Gantt',c:'E04502',d:'2026-09-18',h:'05:00',s:'Lắp thiết bị mới (đến 02:00 ngày 22/09)',bar:'2026-09-22T02:00'},
 {p:'bdtt',x:'Đường Gantt',c:'E04502',d:'2026-09-22',h:'02:00',s:'Kiểm tra: RT mối hàn, sửa chữa nếu có (đến 04:00 ngày 24/09)',bar:'2026-09-24T04:00'},
 {p:'bdtt',x:'Đường Gantt',c:'E04502',d:'2026-09-24',h:'04:00',s:'Lắp lại internal, seal gasket, manhole đỉnh (đến 23:00 ngày 24/09)',bar:'2026-09-24T23:00'},

 // ===== ĐƯỜNG GANTT: T20205 =====
 {p:'bdtt',x:'Đường Gantt',c:'T20205',d:'2026-09-16',h:'—',s:'Mở manhole đỉnh T20205; chèn 3 bích mù 8" đầu ra Mixbed khi dừng Mixbed'},
 {p:'bdtt',x:'Đường Gantt',c:'T20205',d:'2026-09-17',h:'15:00',s:'Mở 2 manhole dưới, chèn 2 bích mù 4" sau 20PV2019 và đường bypass (đến 16:00)'},
 {p:'bdtt',x:'Đường Gantt',c:'T20205',d:'2026-09-17',h:'16:00',s:'Lắp giáo trong bồn (đến 20:00)'},
 {p:'bdtt',x:'Đường Gantt',c:'T20205',d:'2026-09-17',h:'20:00',s:'Vệ sinh bồn (đến 22:00)'},
 {p:'bdtt',x:'Đường Gantt',c:'T20205',d:'2026-09-18',h:'07:00',s:'Vệ sinh bồn cả ngày (đến 22:00)',bar:'2026-09-18T22:00'},
 {p:'bdtt',x:'Đường Gantt',c:'T20205',d:'2026-09-19',h:'07:00',s:'Vệ sinh bồn cả ngày (đến 22:00)',bar:'2026-09-19T22:00'},
 {p:'bangiao',x:'Đường Gantt',c:'T20205',d:'2026-09-20',h:'07:00',s:'Bàn giao BDSC bồn (đến 22:00)',bar:'2026-09-20T22:00'},
 {p:'bdtt',x:'Đường Gantt',c:'T20205',d:'2026-09-21',h:'13:00',s:'Tháo giáo và vệ sinh lại (đến 19:00)'},
 {p:'bdtt',x:'Đường Gantt',c:'T20205',d:'2026-09-21',h:'19:00',s:'Đóng manhole (đến 20:00)'},
 {p:'bdtt',x:'Đường Gantt',c:'T20205',d:'2026-09-21',h:'20:00',s:'Tháo 5 bích mù (đến 22:00)'},
 {p:'khoidong',x:'Đường Gantt',c:'T20205',d:'2026-09-21',h:'22:00',s:'Chạy lại hệ thống Demi'}
];

export const schedulePhases: ReadonlyArray<{
  readonly key: SchedulePhase;
  readonly label: string;
}> = [
  { key: "dung", label: "Dừng máy" },
  { key: "bangiao", label: "Bàn giao" },
  { key: "bdtt", label: "Bảo dưỡng" },
  { key: "khoidong", label: "Chạy lại" }
];

export const scheduleAreas: readonly ScheduleArea[] = [
  "Tổng thể",
  "Ammonia",
  "Urê",
  "Phụ trợ",
  "Đường Gantt"
];

export const scheduleAreaDescriptions: Readonly<Record<ScheduleArea, string>> = {
  "Tổng thể": "Toàn nhà máy",
  Ammonia: "Cụm 200–700",
  "Urê": "Cao áp · tạo hạt",
  "Phụ trợ": "20/21/29/31/40/41/51/97",
  "Đường Gantt": "E04502 · T20205"
};
