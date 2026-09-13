export type SchedulePhase = "dung" | "pssr" | "khoidong";

export type ScheduleArea = "Tổng thể" | "Ammonia" | "Urê" | "Phụ trợ";

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

// Các mốc chính được rút gọn từ “Đính kèm 03 - Tiến độ dừng và khởi động Nhà máy”.
export const scheduleEvents: readonly ScheduleEvent[] = [
  // Dừng Nhà máy
  { p: "dung", x: "Tổng thể", c: "Nhà máy", d: "2026-09-19", h: "20:00", s: "Bắt đầu dừng Nhà máy", n: "Hoàn tất lúc 09:30 ngày 22/09, tổng thời gian 61,5 giờ." },
  { p: "dung", x: "Tổng thể", c: "MP Vent Gas, LCO₂ và Chiller", d: "2026-09-19", h: "20:00", s: "Dừng MP Vent Gas, LCO₂, CO₂ Chiller và Air Chiller", n: "Hoàn tất lúc 02:00 ngày 20/09." },

  // Dừng Urê
  { p: "dung", x: "Urê", c: "Xưởng Urê", d: "2026-09-20", h: "09:00", s: "Bắt đầu dừng Xưởng Urê", n: "Hoàn tất lúc 05:00 ngày 22/09, tổng thời gian 44 giờ." },
  { p: "dung", x: "Urê", c: "Tải Nhà máy", d: "2026-09-20", h: "09:00", s: "Giảm tải xuống 50%" },
  { p: "dung", x: "Urê", c: "Cụm cao áp", d: "2026-09-20", h: "11:00", s: "Ngừng CO₂, NH₃; rửa và pha loãng vòng cao áp" },
  { p: "dung", x: "Urê", c: "K06101", d: "2026-09-20", h: "12:00", s: "Dừng máy nén CO₂ và làm nguội tua-bin", n: "Hoàn tất lúc 08:00 ngày 21/09." },
  { p: "dung", x: "Urê", c: "Cụm cao áp", d: "2026-09-20", h: "12:00", s: "Xả và vệ sinh cụm cao áp", n: "Hoàn tất lúc 05:00 ngày 22/09." },
  { p: "dung", x: "Urê", c: "Cụm trung áp và thấp áp", d: "2026-09-20", h: "22:00", s: "Xả, rửa và thổi Nitơ", n: "Hoàn tất lúc 22:00 ngày 21/09." },
  { p: "dung", x: "Urê", c: "PCT", d: "2026-09-21", h: "21:00", s: "Dừng, xả và thổi rửa hệ thống PCT", n: "Hoàn tất lúc 04:00 ngày 22/09." },
  { p: "dung", x: "Urê", c: "Hệ thống hơi", d: "2026-09-22", h: "03:00", s: "Dừng hệ thống hơi", n: "Hoàn tất lúc 04:00." },

  // Dừng Ammonia
  { p: "dung", x: "Ammonia", c: "Xưởng Ammonia", d: "2026-09-20", h: "09:00", s: "Bắt đầu dừng Xưởng Ammonia", n: "Hoàn tất lúc 09:30 ngày 22/09, tổng thời gian 48,5 giờ." },
  { p: "dung", x: "Ammonia", c: "Tải Nhà máy", d: "2026-09-20", h: "09:00", s: "Giảm tải từ 119% xuống 75%" },
  { p: "dung", x: "Ammonia", c: "HRU và ARU", d: "2026-09-20", h: "11:00", s: "Dừng HRU và ARU" },
  { p: "dung", x: "Ammonia", c: "04IS-7", d: "2026-09-20", h: "18:00", s: "Kích hoạt 04IS-7" },
  { p: "dung", x: "Ammonia", c: "K04441 và K04431", d: "2026-09-20", h: "18:30", s: "Dừng máy nén và bắt đầu làm nguội, thổi Nitơ" },
  { p: "dung", x: "Ammonia", c: "Cụm 300", d: "2026-09-20", h: "20:30", s: "Duy trì tuần hoàn MDEA, giảm áp và thổi Nitơ", n: "Hoàn tất lúc 22:30 ngày 21/09." },
  { p: "dung", x: "Ammonia", c: "F04201", d: "2026-09-21", h: "02:30", s: "Giảm tải và ngừng khí thiên nhiên vào Primary Reformer" },
  { p: "dung", x: "Ammonia", c: "R04203", d: "2026-09-21", h: "09:30", s: "Oxy hóa xúc tác R04203", n: "Hoàn tất lúc 15:30." },
  { p: "dung", x: "Ammonia", c: "KT04421", d: "2026-09-21", h: "15:30", s: "Dừng và làm nguội KT04421", n: "Hoàn tất lúc 09:30 ngày 22/09." },

  // Dừng Phụ trợ
  { p: "dung", x: "Phụ trợ", c: "Xưởng Phụ trợ", d: "2026-09-21", h: "21:00", s: "Bắt đầu dừng Xưởng Phụ trợ", n: "Hoàn tất lúc 08:00 ngày 22/09, tổng thời gian 11 giờ." },
  { p: "dung", x: "Phụ trợ", c: "Lò hơi phụ trợ", d: "2026-09-21", h: "21:00", s: "Dừng lò hơi phụ trợ" },
  { p: "dung", x: "Phụ trợ", c: "Cụm 29000", d: "2026-09-21", h: "23:00", s: "Xả và thổi khí thiên nhiên", n: "Hoàn tất lúc 03:00 ngày 22/09." },
  { p: "dung", x: "Phụ trợ", c: "Đuốc - cụm 51000", d: "2026-09-22", h: "03:00", s: "Dừng hệ thống đuốc", n: "Hoàn tất lúc 06:00." },
  { p: "dung", x: "Phụ trợ", c: "Cụm 41000", d: "2026-09-22", h: "04:00", s: "Xả và thổi rửa cụm 41000", n: "Hoàn tất lúc 08:00." },

  // PSSR
  { p: "pssr", x: "Tổng thể", c: "PSSR", d: "2026-09-26", h: "15:00", s: "Bắt đầu rà soát an toàn trước khởi động", n: "Hoàn tất lúc 19:00 ngày 30/09, tổng thời gian 100 giờ." },
  { p: "pssr", x: "Phụ trợ", c: "Cụm 31000", d: "2026-09-26", h: "15:00", s: "PSSR hệ thống PA, IA và N₂", n: "Hoàn tất lúc 21:00." },
  { p: "pssr", x: "Phụ trợ", c: "Cụm 20000 và 40000", d: "2026-09-27", h: "10:00", s: "PSSR cụm 20000 và 40000", n: "Hoàn tất lúc 15:00." },
  { p: "pssr", x: "Phụ trợ", c: "Cụm 29000", d: "2026-09-28", h: "08:00", s: "PSSR BFW, mạng hơi, bình khử khí và lò hơi", n: "Hoàn tất lúc 19:00." },
  { p: "pssr", x: "Phụ trợ", c: "Cụm 41000 và 51000", d: "2026-09-28", h: "10:00", s: "PSSR cụm 41000 và 51000", n: "Hoàn tất lúc 11:00 ngày 29/09." },
  { p: "pssr", x: "Phụ trợ", c: "Cụm 21000 và 97000", d: "2026-09-28", h: "15:00", s: "PSSR cụm 21000 và 97000", n: "Hoàn tất lúc 18:00." },
  { p: "pssr", x: "Ammonia", c: "Cụm 200", d: "2026-09-29", h: "08:00", s: "PSSR cụm 200", n: "Hoàn tất lúc 12:00." },
  { p: "pssr", x: "Ammonia", c: "Hệ thống hơi và cụm 500", d: "2026-09-29", h: "10:00", s: "PSSR hệ thống hơi và cụm 500", n: "Hoàn tất lúc 13:00." },
  { p: "pssr", x: "Ammonia", c: "Cụm 300 và 400", d: "2026-09-29", h: "10:00", s: "PSSR cụm 300 và 400", n: "Hoàn tất chậm nhất lúc 15:00." },
  { p: "pssr", x: "Urê", c: "Cao áp, trung áp, thấp áp và chân không", d: "2026-09-29", h: "11:00", s: "PSSR các cụm công nghệ Urê", n: "Hoàn tất lúc 15:00." },
  { p: "pssr", x: "Urê", c: "K06101", d: "2026-09-30", h: "11:00", s: "PSSR máy nén CO₂", n: "Hoàn tất lúc 14:00." },
  { p: "pssr", x: "Urê", c: "Cụm tạo hạt", d: "2026-09-30", h: "14:00", s: "PSSR cụm tạo hạt", n: "Hoàn tất lúc 19:00." },

  // Khởi động Nhà máy
  { p: "khoidong", x: "Tổng thể", c: "Nhà máy", d: "2026-09-29", h: "13:00", s: "Bắt đầu khởi động Nhà máy", n: "Hoàn tất lúc 03:00 ngày 02/10, tổng thời gian 62 giờ." },

  // Khởi động Phụ trợ
  { p: "khoidong", x: "Phụ trợ", c: "Xưởng Phụ trợ", d: "2026-09-29", h: "13:00", s: "Bắt đầu khởi động Xưởng Phụ trợ", n: "Hoàn tất lúc 12:00 ngày 01/10, tổng thời gian 47 giờ." },
  { p: "khoidong", x: "Phụ trợ", c: "P97001", d: "2026-09-29", h: "13:00", s: "Khởi động bơm nước đầu vào" },
  { p: "khoidong", x: "Phụ trợ", c: "Cụm Demi", d: "2026-09-29", h: "15:00", s: "Khởi động cụm Demi", n: "Phụ thuộc mức T20205; hoàn tất lúc 23:00." },
  { p: "khoidong", x: "Phụ trợ", c: "Bơm nước làm mát Fresh", d: "2026-09-29", h: "22:00", s: "Khởi động bơm Fresh thứ nhất" },
  { p: "khoidong", x: "Phụ trợ", c: "Khí thiên nhiên", d: "2026-09-30", h: "00:00", s: "Cấp khí vào hệ thống", n: "Phụ thuộc nguồn khí PVGas Cà Mau." },
  { p: "khoidong", x: "Phụ trợ", c: "Hệ thống đuốc", d: "2026-09-30", h: "01:00", s: "Khởi động hệ thống đuốc" },
  { p: "khoidong", x: "Phụ trợ", c: "Lò hơi phụ trợ", d: "2026-09-30", h: "02:00", s: "Khởi động lò hơi phụ trợ và gia nhiệt mạng HS", n: "Hoàn tất lúc 12:00." },
  { p: "khoidong", x: "Phụ trợ", c: "Bơm nước làm mát River", d: "2026-09-30", h: "23:00", s: "Khởi động bơm River thứ nhất" },
  { p: "khoidong", x: "Phụ trợ", c: "Bơm làm mát thứ hai", d: "2026-10-01", h: "11:00", s: "Khởi động bơm River và Fresh thứ hai", n: "Hoàn tất lúc 12:00." },

  // Khởi động Ammonia
  { p: "khoidong", x: "Ammonia", c: "Xưởng Ammonia", d: "2026-09-30", h: "02:00", s: "Bắt đầu khởi động Xưởng Ammonia", n: "Hoàn tất lúc 03:00 ngày 02/10, tổng thời gian 49 giờ." },
  { p: "khoidong", x: "Ammonia", c: "Primary Reformer", d: "2026-09-30", h: "02:00", s: "Đánh lửa và gia nhiệt Primary Reformer", n: "Gia nhiệt đến 17:00." },
  { p: "khoidong", x: "Ammonia", c: "HTS mới", d: "2026-09-30", h: "16:00", s: "Gia nhiệt và đưa HTS mới vào vận hành", n: "Hoàn tất lúc 20:00." },
  { p: "khoidong", x: "Ammonia", c: "Primary Reformer", d: "2026-09-30", h: "20:00", s: "Đưa hơi và khí thiên nhiên vào Primary Reformer" },
  { p: "khoidong", x: "Ammonia", c: "K04421", d: "2026-10-01", h: "01:00", s: "Khởi động K04421", n: "Hoàn tất lúc 03:00." },
  { p: "khoidong", x: "Ammonia", c: "Secondary Reformer", d: "2026-10-01", h: "03:00", s: "Đánh lửa Secondary Reformer và tăng tải lên 50%", n: "Đạt khoảng 900°C lúc 10:00." },
  { p: "khoidong", x: "Ammonia", c: "K04441", d: "2026-10-01", h: "11:00", s: "Khởi động máy nén Ammonia K04441", n: "Hoàn tất lúc 13:00." },
  { p: "khoidong", x: "Ammonia", c: "K04431", d: "2026-10-01", h: "13:00", s: "Khởi động máy nén khí tổng hợp K04431", n: "Hoàn tất lúc 15:00." },
  { p: "khoidong", x: "Ammonia", c: "Sản phẩm NH₃", d: "2026-10-01", h: "15:00", s: "Gia nhiệt vòng tổng hợp và tạo sản phẩm NH₃", n: "Dự kiến có sản phẩm lúc 00:00 ngày 02/10." },
  { p: "khoidong", x: "Ammonia", c: "ARU và HRU", d: "2026-10-01", h: "19:00", s: "Khởi động ARU, sau đó khởi động HRU", n: "Hoàn tất HRU lúc 03:00 ngày 02/10." },
  { p: "khoidong", x: "Ammonia", c: "Tải Nhà máy", d: "2026-10-02", h: "00:00", s: "Tăng tải lên 100%", n: "Hoàn tất lúc 02:00." },

  // Khởi động Urê
  { p: "khoidong", x: "Urê", c: "Xưởng Urê", d: "2026-09-29", h: "20:00", s: "Bắt đầu khởi động Xưởng Urê", n: "Hoàn tất lúc 19:00 ngày 01/10, tổng thời gian 47 giờ." },
  { p: "khoidong", x: "Urê", c: "Vòng cao áp", d: "2026-09-29", h: "20:00", s: "Nạp nước Demi và thử kín vòng cao áp", n: "Hoàn tất lúc 00:00 ngày 01/10." },
  { p: "khoidong", x: "Urê", c: "Cụm trung áp", d: "2026-09-30", h: "07:00", s: "Thử kín, xả nước và thổi Nitơ", n: "Hoàn tất lúc 06:00 ngày 01/10." },
  { p: "khoidong", x: "Urê", c: "Cụm thấp áp", d: "2026-09-30", h: "17:00", s: "Thử kín, thổi Nitơ và chuẩn bị dung dịch Ammonia", n: "Hoàn tất lúc 06:00 ngày 01/10." },
  { p: "khoidong", x: "Urê", c: "PCT và đuốc", d: "2026-09-30", h: "20:00", s: "Khởi động hệ thống đuốc và PCT", n: "Hoàn tất lúc 08:00 ngày 01/10." },
  { p: "khoidong", x: "Urê", c: "K06101 và P06102", d: "2026-10-01", h: "12:00", s: "Khởi động máy nén CO₂ K06101 và bơm P06102", n: "Hoàn tất lúc 14:00." },
  { p: "khoidong", x: "Urê", c: "R06101", d: "2026-10-01", h: "14:00", s: "Nạp NH₃, CO₂; tạo tràn và ổn định", n: "Hoàn tất lúc 18:00." },
  { p: "khoidong", x: "Urê", c: "Cụm tạo hạt", d: "2026-10-01", h: "18:00", s: "Khởi động cụm tạo hạt", n: "Hoàn tất lúc 19:00." }
];

export const schedulePhases: ReadonlyArray<{
  readonly key: SchedulePhase;
  readonly label: string;
}> = [
  { key: "dung", label: "Dừng máy" },
  { key: "pssr", label: "PSSR" },
  { key: "khoidong", label: "Khởi động" }
];

export const scheduleAreas: readonly ScheduleArea[] = ["Tổng thể", "Ammonia", "Urê", "Phụ trợ"];

export const scheduleAreaDescriptions: Readonly<Record<ScheduleArea, string>> = {
  "Tổng thể": "Toàn Nhà máy",
  Ammonia: "Xưởng Ammonia",
  "Urê": "Xưởng Urê",
  "Phụ trợ": "Xưởng Phụ trợ"
};
