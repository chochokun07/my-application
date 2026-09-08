param(
  [string]$Config = "$PSScriptRoot\config.json",
  [int]$Port = 8787
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Config)) {
  throw "config.json was not found. Copy config.example.json to config.json and set research_root."
}

if ([string]::IsNullOrWhiteSpace($env:VECTORY_RESEARCH_TOKEN)) {
  throw "VECTORY_RESEARCH_TOKEN is not set. Set a random token with at least 24 characters."
}

python "$PSScriptRoot\server.py" --config $Config --host 127.0.0.1 --port $Port
