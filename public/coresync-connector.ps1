<#
    CoreSync — ตัวเชื่อมต่อสำหรับโหมดทดลอง
    อ่านไฟล์ CSV ที่ระบบเดิมของคุณส่งออกอยู่แล้ว แล้วส่งขึ้นไปแสดงบนหน้าจอ

    ทำไมเป็นสคริปต์ ไม่ใช่โปรแกรมติดตั้ง
      - เปิดอ่านได้ทุกบรรทัด ฝ่าย IT ตรวจแล้วอนุมัติได้เลย
      - ไม่ต้องติดตั้งอะไร PowerShell มีอยู่ในทุกเครื่อง Windows
      - ไม่โดนโปรแกรมป้องกันไวรัสบล็อกเหมือนไฟล์ .exe ที่ไม่ได้เซ็นรับรอง

    สิ่งที่สคริปต์นี้ทำ และไม่ทำ
      - ส่งออกทางเดียวผ่าน HTTPS พอร์ต 443 เท่านั้น
      - ไม่เปิดพอร์ตรับ ไม่เปิดช่องทางให้ใครเข้ามาในเครือข่ายของคุณ
      - ไม่อ่านอะไรนอกจากไฟล์ที่คุณชี้ให้

    ตัวอย่างการใช้งาน
      .\coresync-connector.ps1 -Token "โทเคนจากหน้าเชื่อมต่อ" -Path "C:\export\tags.csv"
      .\coresync-connector.ps1 -Token "..." -Path "C:\export\tags.csv" -IntervalSeconds 10
      .\coresync-connector.ps1 -Token "..." -Path "C:\export\tags.csv" -Once

    รูปแบบไฟล์ CSV ที่รองรับ (ตรวจให้เองอัตโนมัติ)
      แบบที่ 1 — คอลัมน์คือชื่อ tag           แบบที่ 2 — หนึ่งแถวหนึ่งค่า
        Timestamp,KK1_LEVEL,CG1_TEMP            tag,value,timestamp
        2026-08-20T09:00:00,68.4,997            KK1_LEVEL,68.4,2026-08-20T09:00:00
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Token,

    [Parameter(Mandatory = $true)]
    [string]$Path,

    [string]$Endpoint = "https://watcharin-service.com/api/demo/ingest",

    # ส่งเป็นชุดทุกกี่วินาที — อย่าตั้งถี่กว่านี้โดยไม่จำเป็น
    # การยิงทุกวินาทีคิดเป็นคำขอหลายล้านครั้งต่อเดือนโดยไม่ได้ข้อมูลเพิ่มขึ้นจริง
    [int]$IntervalSeconds = 5,

    # ส่งครั้งเดียวแล้วจบ ใช้ตอนทดสอบว่าเครือข่ายส่งออกได้ไหม
    [switch]$Once
)

$ErrorActionPreference = "Stop"
$MaxReadingsPerBatch = 200

# ------------------------------------------------------------------
# คิวสำรองสำหรับตอนส่งไม่ออก
#
# เน็ตหน้างานหลุดเป็นเรื่องปกติ ถ้าทิ้งข้อมูลตอนส่งไม่ได้ กราฟจะขาดช่วง
# เก็บไว้ในหน่วยความจำก่อน แล้วส่งซ้ำเมื่อกลับมาต่อได้
# ระบบจริงเก็บลงดิสก์เพื่อให้รอดแม้เครื่องรีสตาร์ต — โหมดทดลองยังไม่ต้องถึงขั้นนั้น
# ------------------------------------------------------------------
$script:Pending = New-Object System.Collections.ArrayList
$script:MaxPending = 2000

function Write-Status {
    param([string]$Message, [string]$Tone = "Gray")
    $stamp = (Get-Date).ToString("HH:mm:ss")
    Write-Host "[$stamp] $Message" -ForegroundColor $Tone
}

function ConvertTo-Iso {
    <# แปลงเวลาจากไฟล์เป็นรูปแบบมาตรฐาน พร้อมโซนเวลาของเครื่อง
       ถ้าอ่านไม่ออกให้ใช้เวลาปัจจุบัน และเตือนครั้งเดียวพอ #>
    param([string]$Raw)

    if ([string]::IsNullOrWhiteSpace($Raw)) {
        return (Get-Date).ToString("o")
    }
    $parsed = [datetime]::MinValue
    if ([datetime]::TryParse($Raw, [ref]$parsed)) {
        return $parsed.ToString("o")
    }
    if (-not $script:WarnedTime) {
        Write-Status "อ่านคอลัมน์เวลาไม่ออก ('$Raw') — ใช้เวลาของเครื่องแทน" "Yellow"
        $script:WarnedTime = $true
    }
    return (Get-Date).ToString("o")
}

function Get-Readings {
    <# อ่าน CSV แล้วแปลงเป็นรายการค่าที่พร้อมส่ง
       ตรวจรูปแบบไฟล์ให้เองว่าเป็นแบบคอลัมน์คือ tag หรือแบบหนึ่งแถวหนึ่งค่า #>
    param([string]$CsvPath)

    if (-not (Test-Path -LiteralPath $CsvPath)) {
        throw "ไม่พบไฟล์ $CsvPath"
    }

    $rows = Import-Csv -LiteralPath $CsvPath -Encoding UTF8
    if ($rows.Count -eq 0) { return @() }

    $columns = $rows[0].PSObject.Properties.Name
    $lower = $columns | ForEach-Object { $_.ToLower() }

    $readings = New-Object System.Collections.ArrayList

    if (($lower -contains "tag") -and ($lower -contains "value")) {
        # ---------- แบบที่ 2: หนึ่งแถวหนึ่งค่า ----------
        $tagCol = $columns[[array]::IndexOf($lower, "tag")]
        $valCol = $columns[[array]::IndexOf($lower, "value")]
        $timeCol = $null
        foreach ($candidate in @("timestamp", "time", "datetime", "ts")) {
            if ($lower -contains $candidate) {
                $timeCol = $columns[[array]::IndexOf($lower, $candidate)]
                break
            }
        }
        $unitCol = $null
        if ($lower -contains "unit") { $unitCol = $columns[[array]::IndexOf($lower, "unit")] }

        foreach ($row in $rows) {
            $tag = "$($row.$tagCol)".Trim()
            if ([string]::IsNullOrWhiteSpace($tag)) { continue }
            $rawTime = ""
            if ($timeCol) { $rawTime = "$($row.$timeCol)" }
            $reading = @{
                tag   = $tag
                value = ConvertTo-Value $row.$valCol
                ts    = ConvertTo-Iso $rawTime
            }
            if ($unitCol -and -not [string]::IsNullOrWhiteSpace("$($row.$unitCol)")) {
                $reading.unit = "$($row.$unitCol)".Trim()
            }
            [void]$readings.Add($reading)
        }
    }
    else {
        # ---------- แบบที่ 1: คอลัมน์คือชื่อ tag ----------
        $timeCol = $null
        foreach ($candidate in @("timestamp", "time", "datetime", "ts")) {
            if ($lower -contains $candidate) {
                $timeCol = $columns[[array]::IndexOf($lower, $candidate)]
                break
            }
        }

        # เอาเฉพาะแถวสุดท้าย — ไฟล์ export ส่วนใหญ่ต่อท้ายเรื่อย ๆ
        # ค่าที่สนใจในโหมดทดลองคือค่าล่าสุด ไม่ใช่ประวัติทั้งไฟล์
        $row = $rows[$rows.Count - 1]
        $rawTime = ""
        if ($timeCol) { $rawTime = "$($row.$timeCol)" }
        $ts = ConvertTo-Iso $rawTime

        foreach ($column in $columns) {
            if ($column -eq $timeCol) { continue }
            $raw = "$($row.$column)"
            if ([string]::IsNullOrWhiteSpace($raw)) { continue }
            [void]$readings.Add(@{
                    tag   = $column.Trim()
                    value = ConvertTo-Value $raw
                    ts    = $ts
                })
        }
    }

    return $readings.ToArray()
}

function ConvertTo-Value {
    <# ตัวเลขให้เป็นตัวเลข true/false ให้เป็นค่าตรรกะ ที่เหลือเป็นข้อความ
       ถ้าส่งตัวเลขไปเป็นข้อความ หน้าจอจะวาดกราฟให้ไม่ได้ #>
    param($Raw)

    $text = "$Raw".Trim()
    if ([string]::IsNullOrWhiteSpace($text)) { return "" }

    $number = 0.0
    $style = [System.Globalization.NumberStyles]::Float
    $invariant = [System.Globalization.CultureInfo]::InvariantCulture
    if ([double]::TryParse($text, $style, $invariant, [ref]$number)) { return $number }

    switch ($text.ToLower()) {
        "true" { return $true }
        "false" { return $false }
    }
    return $text
}

function Send-Batch {
    <# ส่งหนึ่งชุด คืนค่า true เมื่อสำเร็จ
       PowerShell 5.1 ส่ง body เป็นสตริงแล้วภาษาไทยจะเพี้ยน จึงต้องแปลงเป็นไบต์ UTF-8 เอง #>
    param([array]$Readings)

    $payload = @{ token = $Token; sentAt = (Get-Date).ToString("o"); readings = $Readings }
    $json = $payload | ConvertTo-Json -Depth 6 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

    try {
        $response = Invoke-RestMethod -Uri $Endpoint -Method Post -Body $bytes `
            -ContentType "application/json; charset=utf-8" -TimeoutSec 20
        Write-Status "ส่งสำเร็จ $($response.accepted) ค่า" "Green"
        return $true
    }
    catch {
        $detail = $_.Exception.Message
        # ดึงข้อความจริงจากเซิร์ฟเวอร์ออกมา ไม่งั้นจะเห็นแค่ 400 Bad Request
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $body = $reader.ReadToEnd()
                if ($body) {
                    $parsed = $body | ConvertFrom-Json
                    if ($parsed.error) { $detail = $parsed.error }
                }
            }
            catch {
                # อ่านรายละเอียดไม่ได้ ใช้ข้อความเดิม
            }
        }
        Write-Status "ส่งไม่สำเร็จ: $detail" "Red"
        return $false
    }
}

function Invoke-Cycle {
    $readings = @(Get-Readings -CsvPath $Path)
    if ($readings.Count -eq 0) {
        Write-Status "ไม่มีข้อมูลในไฟล์" "Yellow"
        return
    }

    # ต่อท้ายคิวเดิมที่ยังส่งไม่ออก แล้วส่งรวมกัน
    foreach ($reading in $readings) { [void]$script:Pending.Add($reading) }

    if ($script:Pending.Count -gt $script:MaxPending) {
        $drop = $script:Pending.Count - $script:MaxPending
        $script:Pending.RemoveRange(0, $drop)
        Write-Status "คิวเต็ม ตัดข้อมูลเก่าทิ้ง $drop ค่า" "Yellow"
    }

    while ($script:Pending.Count -gt 0) {
        $take = [Math]::Min($MaxReadingsPerBatch, $script:Pending.Count)
        $batch = $script:Pending.GetRange(0, $take).ToArray()

        if (Send-Batch -Readings $batch) {
            $script:Pending.RemoveRange(0, $take)
        }
        else {
            Write-Status "เก็บไว้ในคิว $($script:Pending.Count) ค่า จะลองใหม่รอบหน้า" "Yellow"
            break
        }
    }
}

# ------------------------------------------------------------------
Write-Host ""
Write-Host "CoreSync — ตัวเชื่อมต่อโหมดทดลอง" -ForegroundColor Cyan
Write-Host "ไฟล์ต้นทาง : $Path"
Write-Host "ปลายทาง    : $Endpoint"
if (-not $Once) { Write-Host "ส่งทุก      : $IntervalSeconds วินาที  (กด Ctrl+C เพื่อหยุด)" }
Write-Host ""

if ($Once) {
    Invoke-Cycle
    exit 0
}

while ($true) {
    try {
        Invoke-Cycle
    }
    catch {
        Write-Status $_.Exception.Message "Red"
    }
    Start-Sleep -Seconds $IntervalSeconds
}
