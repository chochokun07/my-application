param(
  [string]$Config = "$PSScriptRoot\config.json",
  [int]$Port = 8787
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Config)) {
  throw "config.json がありません。config.example.json をコピーして研究フォルダーを設定してください。"
}

if ([string]::IsNullOrWhiteSpace($env:VECTORY_RESEARCH_TOKEN)) {
  throw "VECTORY_RESEARCH_TOKEN が未設定です。24文字以上のランダムな値を設定してください。"
}

python "$PSScriptRoot\server.py" --config $Config --host 127.0.0.1 --port $Port
