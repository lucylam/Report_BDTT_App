$ErrorActionPreference = "Stop"

$ScriptBase = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path (Get-Location) "scripts" }
$Root = Resolve-Path (Join-Path $ScriptBase "..")
$DocsDir = Join-Path $Root "docs"
$AssetDir = Join-Path $DocsDir "user-guide-assets"
$OutputPath = Join-Path $DocsDir "BDTT_User_Guide_Mobile.pptx"

function Rgb($r, $g, $b) {
  return $r + ($g * 256) + ($b * 65536)
}

$Colors = @{
  Ink = Rgb 18 20 17
  Muted = Rgb 116 116 108
  Soft = Rgb 245 242 235
  Card = Rgb 255 255 252
  Line = Rgb 224 221 214
  Lime = Rgb 174 234 69
  Green = Rgb 100 168 25
  Orange = Rgb 243 163 59
  Red = Rgb 226 91 54
  Blue = Rgb 76 143 217
  Dark = Rgb 28 32 24
}

function Set-Fill($Shape, $Color, $Transparency = 0) {
  $Shape.Fill.Visible = -1
  $Shape.Fill.ForeColor.RGB = $Color
  $Shape.Fill.Transparency = $Transparency
}

function Set-Line($Shape, $Color, $Weight = 1, $Transparency = 0) {
  $Shape.Line.Visible = -1
  $Shape.Line.ForeColor.RGB = $Color
  $Shape.Line.Weight = $Weight
  $Shape.Line.Transparency = $Transparency
}

function Add-Text($Slide, $Text, $Left, $Top, $Width, $Height, $Size, $Color, $Bold = $false, $Font = "Aptos") {
  $Shape = $Slide.Shapes.AddTextbox(1, $Left, $Top, $Width, $Height)
  $Shape.TextFrame.MarginLeft = 0
  $Shape.TextFrame.MarginRight = 0
  $Shape.TextFrame.MarginTop = 0
  $Shape.TextFrame.MarginBottom = 0
  $Shape.TextFrame.WordWrap = -1
  $Shape.TextFrame.TextRange.Text = $Text
  $Shape.TextFrame.TextRange.Font.Name = $Font
  $Shape.TextFrame.TextRange.Font.Size = $Size
  $Shape.TextFrame.TextRange.Font.Color.RGB = $Color
  $Shape.TextFrame.TextRange.Font.Bold = if ($Bold) { -1 } else { 0 }
  return $Shape
}

function Add-Bullets($Slide, $Items, $Left, $Top, $Width, $Height, $Size = 15) {
  $Text = (($Items | ForEach-Object { "- $_" }) -join [Environment]::NewLine)
  $Shape = Add-Text $Slide $Text $Left $Top $Width $Height $Size $Colors.Muted $false
  $Shape.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 7
  return $Shape
}

function Add-Panel($Slide, $Left, $Top, $Width, $Height, $Title, $Body, $AccentColor = $null) {
  $Panel = $Slide.Shapes.AddShape(5, $Left, $Top, $Width, $Height)
  Set-Fill $Panel $Colors.Card
  Set-Line $Panel $Colors.Line 1
  if ($AccentColor -ne $null) {
    $Bar = $Slide.Shapes.AddShape(1, $Left, $Top, 8, $Height)
    Set-Fill $Bar $AccentColor
    $Bar.Line.Visible = 0
  }
  Add-Text $Slide $Title ($Left + 20) ($Top + 18) ($Width - 40) 24 16 $Colors.Ink $true | Out-Null
  Add-Text $Slide $Body ($Left + 20) ($Top + 48) ($Width - 40) ($Height - 56) 13 $Colors.Muted $false | Out-Null
}

function Add-Chip($Slide, $Text, $Left, $Top, $Width, $Color) {
  $Chip = $Slide.Shapes.AddShape(5, $Left, $Top, $Width, 34)
  Set-Fill $Chip $Color
  $Chip.Line.Visible = 0
  $Box = Add-Text $Slide $Text ($Left + 10) ($Top + 8) ($Width - 20) 18 12 $Colors.Ink $true
  $Box.TextFrame.TextRange.ParagraphFormat.Alignment = 2
}

function Add-PhoneImage($Slide, $ImageName, $Left, $Top, $Height, $Caption = "") {
  $ImagePath = Join-Path $AssetDir $ImageName
  if (-not (Test-Path $ImagePath)) {
    throw "Missing screenshot: $ImagePath"
  }
  $Width = $Height * 780 / 1688
  $Frame = $Slide.Shapes.AddShape(5, ($Left - 5), ($Top - 5), ($Width + 10), ($Height + 10))
  Set-Fill $Frame $Colors.Dark
  Set-Line $Frame (Rgb 48 52 42) 1
  $Slide.Shapes.AddPicture($ImagePath, 0, -1, $Left, $Top, $Width, $Height) | Out-Null
  if ($Caption -ne "") {
    Add-Text $Slide $Caption ($Left - 12) ($Top + $Height + 10) ($Width + 24) 32 12 $Colors.Muted $false | Out-Null
  }
}

function Add-Header($Slide, $Eyebrow, $Title, $Subtitle = "") {
  Add-Text $Slide $Eyebrow 54 32 520 20 12 $Colors.Green $true | Out-Null
  Add-Text $Slide $Title 54 58 610 46 28 $Colors.Ink $true "Aptos Display" | Out-Null
  if ($Subtitle -ne "") {
    Add-Text $Slide $Subtitle 54 105 620 30 13 $Colors.Muted $false | Out-Null
  }
}

function Add-Footer($Slide, $Number) {
  Add-Text $Slide "BDTT 2026 - Hướng dẫn sử dụng" 54 508 380 16 9 $Colors.Muted $false | Out-Null
  Add-Text $Slide $Number 880 508 28 16 9 $Colors.Muted $false | Out-Null
}

if (Test-Path $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

$ppt = New-Object -ComObject PowerPoint.Application
$presentation = $ppt.Presentations.Add()
$presentation.PageSetup.SlideWidth = 960
$presentation.PageSetup.SlideHeight = 540

try {
  $slideIndex = 1

  $Slide = $presentation.Slides.Add($slideIndex, 12)
  $Bg = $Slide.Shapes.AddShape(1, 0, 0, 960, 540)
  Set-Fill $Bg $Colors.Soft
  $Bg.Line.Visible = 0
  $Hero = $Slide.Shapes.AddShape(5, 42, 38, 516, 430)
  Set-Fill $Hero $Colors.Dark
  $Hero.Line.Visible = 0
  Add-Text $Slide "BDTT 2026" 82 76 220 24 14 $Colors.Lime $true | Out-Null
  Add-Text $Slide "Hướng dẫn sử dụng app báo cáo tiến độ" 82 116 390 116 34 (Rgb 255 255 248) $true "Aptos Display" | Out-Null
  Add-Text $Slide "Dành cho worker, giám sát và admin dữ liệu. Tập trung vào thao tác mobile, cập nhật an toàn và theo dõi dashboard." 84 254 374 70 15 (Rgb 215 218 205) $false | Out-Null
  Add-Chip $Slide "Worker" 82 360 98 $Colors.Lime
  Add-Chip $Slide "Giám sát" 196 360 112 $Colors.Orange
  Add-Chip $Slide "Admin DATA" 326 360 130 (Rgb 220 226 214)
  Add-PhoneImage $Slide "mobile-worker-tasks.png" 610 58 370 "Màn hình mobile thực tế"
  Add-Footer $Slide "01"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "TỔNG QUAN" "App dùng để làm gì?" "Luồng dữ liệu được thiết kế để giảm nhầm lẫn khi cập nhật tiến độ trong ca."
  Add-Panel $Slide 60 158 245 170 "Worker" "Nhận danh sách hạng mục được giao, lọc nhanh theo tag/WO/khu vực, chỉnh tiến độ và ghi chú. Thay đổi chỉ gửi khi bấm Cập nhật." $Colors.Lime
  Add-Panel $Slide 358 158 245 170 "Giám sát" "Theo dõi KPI trong ngày, phát hiện nhóm cần tăng cường, kiểm tra WorkOrder trễ và xem tình trạng cập nhật của worker." $Colors.Orange
  Add-Panel $Slide 655 158 245 170 "Admin / DATA" "Import danh sách hạng mục, kiểm tra nhân sự, export/sync dữ liệu phục vụ tổng hợp báo cáo." $Colors.Blue
  Add-Text $Slide "Worker cập nhật -> Chờ cập nhật -> Cập nhật -> Database/local queue -> Dashboard giám sát" 94 388 770 34 18 $Colors.Ink $true | Out-Null
  Add-Bullets $Slide @(
    "Không lưu ngay khi chạm nhầm vào % tiến độ.",
    "Có thể hủy thay đổi trước khi gửi.",
    "Dashboard chỉ nên được xem là dữ liệu chính thức sau khi worker bấm Cập nhật."
  ) 120 428 720 66 13 | Out-Null
  Add-Footer $Slide "02"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "BẮT ĐẦU" "Đăng nhập và đổi mật khẩu" "Tài khoản nội bộ được cấp theo username. Nếu là lần đầu, app sẽ yêu cầu đổi mật khẩu riêng."
  Add-Panel $Slide 60 156 260 255 "1. Đăng nhập" "Nhập username và mật khẩu được cấp. Bật ghi nhớ đăng nhập nếu dùng thiết bị cá nhân hoặc thiết bị ca trực ổn định." $Colors.Lime
  Add-Panel $Slide 350 156 260 255 "2. Đổi mật khẩu" "Mật khẩu mới phải khác mật khẩu mặc định và đủ độ dài. Nếu nhập lại mật khẩu mặc định, app chỉ cảnh báo và không cho đổi." $Colors.Orange
  Add-Panel $Slide 640 156 260 255 "3. Vào đúng vai trò" "Worker vào Workspace. Giám sát/admin có thêm Giám sát, WorkOrder, Nhân sự và DATA tùy quyền tài khoản." $Colors.Blue
  Add-Bullets $Slide @(
    "Không chia sẻ tài khoản vì lịch sử cập nhật gắn với từng user.",
    "Khi đổi thiết bị, nên đăng xuất ở thiết bị cũ.",
    "Nếu mất quyền hoặc không thấy việc, liên hệ nhóm trưởng/admin dữ liệu."
  ) 80 438 780 52 13 | Out-Null
  Add-Footer $Slide "03"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "WORKER MOBILE" "Màn hình Việc của tôi" "Đây là màn hình worker dùng nhiều nhất trong ca."
  Add-PhoneImage $Slide "mobile-worker-tasks.png" 70 140 330 "Danh sách việc"
  Add-Panel $Slide 286 152 600 86 "Khu vực đầu trang" "Hiển thị tên user, ngày báo cáo, % tiến độ cá nhân, trạng thái online/offline, nút đổi theme và tài khoản." $Colors.Lime
  Add-Panel $Slide 286 260 600 88 "Bộ lọc nhanh" "Dùng các tab Tất cả, Chưa làm, Đang làm, Xong, PI chưa xong và Hủy để thu hẹp danh sách hạng mục." $Colors.Orange
  Add-Panel $Slide 286 370 600 88 "Danh sách task" "Mỗi card có tagname, mô tả hạng mục, mức ưu tiên, đơn vị, duration, thanh tiến độ và bộ chọn %." $Colors.Blue
  Add-Footer $Slide "04"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "TÌM KIẾM" "Tìm đúng hạng mục trước khi cập nhật" "Tìm kiếm vẫn match theo tagname, WO, hạng mục, khu vực và thông tin liên quan."
  Add-Bullets $Slide @(
    "Gõ tagname như 41PT-1007 để tìm nhanh thiết bị.",
    "Gõ số WO nếu đang làm theo WorkOrder.",
    "Gõ khu vực/section khi cần lọc nhiều thiết bị cùng khu.",
    "Chọn Theo đơn vị hoặc Theo section để đổi cách nhóm danh sách.",
    "Nếu danh sách trống, xóa từ khóa hoặc chuyển filter về Tất cả."
  ) 70 152 420 210 16 | Out-Null
  Add-Panel $Slide 70 388 420 70 "Quy tắc thao tác" "Chỉ cập nhật khi đã chắc chắn đúng tagname/WO. Nếu nghi ngờ bị giao thiếu việc, không tự nhập dữ liệu ngoài danh sách." $Colors.Red
  Add-PhoneImage $Slide "mobile-worker-tasks.png" 632 124 350 "Search và filter"
  Add-Footer $Slide "05"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "CẬP NHẬT TIẾN ĐỘ" "Chỉnh nhiều task, rồi bấm Cập nhật" "Flow mới giúp tránh việc chạm nhầm làm thay đổi database ngay lập tức."
  Add-PhoneImage $Slide "mobile-worker-pending-update.png" 60 126 350 "Trạng thái chờ cập nhật"
  Add-Bullets $Slide @(
    "Chọn % tiến độ trên một hoặc nhiều task.",
    "Task vừa chỉnh sẽ có trạng thái Chờ cập nhật.",
    "Thanh cuối màn hình hiển thị số thay đổi đang chờ gửi.",
    "Bấm Hủy thay đổi nếu thao tác nhầm.",
    "Bấm Cập nhật khi đã kiểm tra xong. Lúc đó dữ liệu mới được ghi chính thức."
  ) 300 154 560 190 16 | Out-Null
  Add-Panel $Slide 300 378 560 70 "Lưu ý quan trọng" "Dashboard giám sát và lịch sử chính thức chỉ phản ánh dữ liệu đã được Cập nhật, không lấy các thay đổi còn đang chờ." $Colors.Lime
  Add-Footer $Slide "06"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "GHI CHÚ / ẢNH / HỦY" "Khi nào cần nhập thêm thông tin?" "Dùng ghi chú ngắn, rõ hiện trạng. Ảnh chỉ nên thêm khi cần chứng minh tình trạng thực tế."
  Add-Panel $Slide 70 150 250 210 "Ghi chú" "Bấm Mở ghi chú / ảnh, nhập nội dung ngắn: đang kiểm tra, thiếu vật tư, chờ cô lập, phát sinh trở ngại..." $Colors.Lime
  Add-Panel $Slide 356 150 250 210 "Ảnh" "Đính kèm ảnh khi cần xác nhận hiện trường. Ảnh nên rõ tag, thiết bị hoặc vị trí liên quan." $Colors.Blue
  Add-Panel $Slide 642 150 250 210 "Hủy hạng mục" "Chỉ dùng khi hạng mục không thực hiện trong ca hoặc có chỉ đạo hủy. Luôn nhập lý do để admin/giám sát kiểm tra." $Colors.Red
  Add-Bullets $Slide @(
    "Không ghi dữ liệu nhạy cảm ngoài phạm vi báo cáo tiến độ.",
    "Không dùng ghi chú để thay thế quy trình bàn giao/an toàn.",
    "Sau khi nhập ghi chú/ảnh, vẫn phải bấm Cập nhật để gửi."
  ) 86 406 780 60 14 | Out-Null
  Add-Footer $Slide "07"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "THEO DÕI CÁ NHÂN" "Tổng quan và Lịch sử" "Hai tab này giúp worker tự kiểm tra tiến độ đã gửi và các lần cập nhật trong ngày."
  Add-PhoneImage $Slide "mobile-worker-overview.png" 80 128 330 "Tổng quan"
  Add-PhoneImage $Slide "mobile-worker-history.png" 310 128 330 "Lịch sử"
  Add-Bullets $Slide @(
    "Tổng quan: xem tỷ lệ hoàn thành, số việc chưa làm/đang làm/xong.",
    "Lịch sử: kiểm tra các cập nhật đã gửi, thời điểm gửi và nội dung ghi chú.",
    "Nếu không thấy cập nhật mới trong lịch sử, kiểm tra lại thanh chờ cập nhật hoặc trạng thái online/offline."
  ) 560 158 330 190 15 | Out-Null
  Add-Panel $Slide 560 378 330 68 "Mẹo kiểm tra" "Sau khi bấm Cập nhật, mở Lịch sử để xác nhận dữ liệu đã được ghi nhận." $Colors.Lime
  Add-Footer $Slide "08"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "GIÁM SÁT" "Dashboard mobile" "Dùng để nhìn nhanh tình hình trong ca và ưu tiên nhóm cần theo dõi."
  Add-PhoneImage $Slide "mobile-admin-dashboard.png" 74 128 342 "Dashboard giám sát"
  Add-Bullets $Slide @(
    "Đơn vị báo cáo: số đơn vị/nhóm có cập nhật trong ngày.",
    "Đáp ứng kế hoạch: nhóm đạt mốc tiến độ theo ngưỡng.",
    "Cần tăng cường: nhóm có tiến độ thấp hoặc nhiều việc chưa triển khai.",
    "WorkOrder trễ: hạng mục quá Finish date nhưng chưa hoàn thành.",
    "Tỷ lệ đạt TB: mức hoàn thành trung bình theo phạm vi đang xem."
  ) 300 150 550 190 15 | Out-Null
  Add-Panel $Slide 300 380 550 70 "Cách dùng trong ca" "Mở dashboard sau các mốc cập nhật chính để phát hiện nhóm chưa gửi báo cáo hoặc nhóm có nhiều WO trễ." $Colors.Orange
  Add-Footer $Slide "09"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "WORKORDER / NHÂN SỰ / DATA" "Các màn hình dành cho giám sát và admin" "Các page này dùng để rà soát chi tiết, không thay thế việc worker tự cập nhật phần việc của mình."
  Add-PhoneImage $Slide "mobile-admin-workorder.png" 70 128 342 "WorkOrder mobile"
  Add-Panel $Slide 300 142 560 74 "WorkOrder" "Tìm và kiểm tra chi tiết hạng mục theo tagname, WO, section, nhóm, đơn vị, tiến độ, trạng thái và Finish." $Colors.Lime
  Add-Panel $Slide 300 236 560 74 "Nhân sự" "Xem danh sách người dùng, nhóm, phân quyền và tình trạng báo cáo trong ngày." $Colors.Blue
  Add-Panel $Slide 300 330 560 74 "DATA" "Import dữ liệu, xem preview, xác nhận replace, export hoặc sync theo quyền admin dữ liệu." $Colors.Orange
  Add-Bullets $Slide @(
    "Không import/replace dữ liệu khi chưa kiểm tra preview.",
    "Khi search WorkOrder, cột hạng mục có thể ẩn trên UI nhưng vẫn được dùng để match kết quả."
  ) 316 430 520 44 13 | Out-Null
  Add-Footer $Slide "10"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "QUY TRÌNH TRONG NGÀY" "Checklist thao tác đề xuất" "Dùng checklist này để giảm bỏ sót cập nhật khi ca có nhiều hạng mục."
  Add-Panel $Slide 70 150 250 235 "Đầu ca" "1. Đăng nhập đúng tài khoản.`r`n2. Kiểm tra ngày báo cáo.`r`n3. Lọc Tất cả và rà danh sách được giao.`r`n4. Báo nhóm trưởng nếu thiếu/sai hạng mục." $Colors.Blue
  Add-Panel $Slide 356 150 250 235 "Trong ca" "1. Tìm đúng tag/WO.`r`n2. Cập nhật % theo thực tế.`r`n3. Ghi chú khi có vướng mắc.`r`n4. Kiểm tra thanh chờ cập nhật trước khi gửi." $Colors.Lime
  Add-Panel $Slide 642 150 250 235 "Cuối mốc báo cáo" "1. Bấm Cập nhật.`r`n2. Mở Lịch sử kiểm tra.`r`n3. Xử lý các task còn Chưa làm/Đang làm.`r`n4. Báo giám sát nếu offline chưa sync." $Colors.Orange
  Add-Text $Slide "Nguyên tắc: đúng hạng mục, đúng tình trạng, gửi sau khi đã kiểm tra." 132 430 700 30 18 $Colors.Ink $true | Out-Null
  Add-Footer $Slide "11"

  $slideIndex += 1
  $Slide = $presentation.Slides.Add($slideIndex, 12)
  Add-Header $Slide "XỬ LÝ SỰ CỐ" "Các tình huống thường gặp" "Nếu lỗi vẫn lặp lại, chụp màn hình và gửi kèm username, thời điểm, tag/WO liên quan."
  Add-Panel $Slide 70 148 390 86 "Không thấy việc" "Xóa từ khóa tìm kiếm, chuyển filter về Tất cả. Nếu vẫn trống, có thể chưa được giao hạng mục hoặc dữ liệu import chưa đúng." $Colors.Orange
  Add-Panel $Slide 70 256 390 86 "Đã chỉnh nhưng dashboard chưa đổi" "Kiểm tra còn thanh chờ cập nhật không. Dashboard chỉ đổi sau khi bấm Cập nhật và dữ liệu ghi thành công." $Colors.Lime
  Add-Panel $Slide 70 364 390 86 "Mất mạng / offline" "Không thao tác nhiều lần liên tục. Chờ online lại rồi kiểm tra Lịch sử hoặc báo giám sát nếu dữ liệu chưa đồng bộ." $Colors.Blue
  Add-Panel $Slide 510 148 370 86 "Sai mật khẩu" "Kiểm tra username, dấu cách, kiểu gõ. Mật khẩu mới không được trùng mật khẩu mặc định." $Colors.Red
  Add-Panel $Slide 510 256 370 86 "Chạm nhầm tiến độ" "Bấm Hủy thay đổi trước khi Cập nhật. Nếu đã gửi rồi, cập nhật lại đúng trạng thái và ghi chú lý do." $Colors.Orange
  Add-Panel $Slide 510 364 370 86 "Cần hỗ trợ" "Liên hệ nhóm trưởng hoặc admin dữ liệu. Không tự sửa dữ liệu import nếu không có quyền." $Colors.Lime
  Add-Footer $Slide "12"

  $presentation.SaveAs($OutputPath, 24)
  Write-Output "SAVED=$OutputPath"
  Write-Output "SLIDES=$($presentation.Slides.Count)"
} finally {
  if ($presentation) {
    $presentation.Close()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
  }
  if ($ppt) {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
