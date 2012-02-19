;--------------------------------

; The name of the installer
Name "Anywhere Board Games"

; The file to write
OutFile "abg.exe"

; The default installation directory
InstallDir c:\ABG

; Registry key to check for directory (so if you install again, it will 
; overwrite the old one automatically)
InstallDirRegKey HKLM "Software\ABGames" "Install_Dir"

; Request application privileges for Windows Vista
RequestExecutionLevel admin

;--------------------------------

; Pages

Page components
;Page directory
Page instfiles

UninstPage uninstConfirm
UninstPage instfiles

;--------------------------------

; The stuff to install
Section "ABG Server (required)"

  SectionIn RO
  
  ; Set output path to the installation directory.
  SetOutPath $INSTDIR
  
  ; Put file there
  File "abg.nsi"
  
  ; Write the installation path into the registry
  WriteRegStr HKLM SOFTWARE\ABGames "Install_Dir" "$INSTDIR"
  
  ; Write the uninstall keys for Windows
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames" "DisplayName" "NSIS ABGames"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames" "NoRepair" 1
  WriteUninstaller "uninstall.exe"
  
SectionEnd

; Optional section (can be disabled by the user)
Section "Start Menu Shortcuts"

  CreateDirectory "$SMPROGRAMS\ABGames"
  CreateShortCut "$SMPROGRAMS\ABGames\Uninstall.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0
  CreateShortCut "$SMPROGRAMS\ABGames\ABGames (MakeNSISW).lnk" "$INSTDIR\abg.nsi" "" "$INSTDIR\abg.nsi" 0
  
SectionEnd

;--------------------------------

; Uninstaller

Section "Uninstall"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames"
  DeleteRegKey HKLM SOFTWARE\NSIS_ABGames

  ; Remove files and uninstaller
  Delete $INSTDIR\abg.nsi
  Delete $INSTDIR\uninstall.exe

  ; Remove shortcuts, if any
  Delete "$SMPROGRAMS\ABGames\*.*"

  ; Remove directories used
  RMDir "$SMPROGRAMS\ABGames"
  RMDir "$INSTDIR"

SectionEnd
