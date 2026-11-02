@echo off
setlocal

REM Resolve paths from this script, regardless of the caller's working directory.
pushd "%~dp0..\.." || exit /b 1
call npx --no-install kysely-codegen --env-file=..\.env --out-file=src\db\types.ts
set "generation_exit=%errorlevel%"
popd
exit /b %generation_exit%
