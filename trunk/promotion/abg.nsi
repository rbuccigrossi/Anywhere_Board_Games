;--------------------------------

; The name of the installer
Name "Anywhere Board Games"

; Icon
Icon c:\ABG\www\images\ABGLogo48x48.ico

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
  
  ; Copy full c:\ABG directory
  File /r c:\ABG\*.*
  
  ; Write the installation path into the registry
  WriteRegStr HKLM SOFTWARE\ABGames "Install_Dir" "$INSTDIR"
  
  ; Write the uninstall keys for Windows
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames" "DisplayName" "Anywhere Board Games"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames" "NoRepair" 1
  WriteUninstaller "uninstall.exe"
  
SectionEnd

; Optional section (can be disabled by the user)
Section "Start Menu Shortcuts"

  CreateDirectory "$SMPROGRAMS\ABGames"
  CreateShortCut "$SMPROGRAMS\ABGames\Start ABG Server (Mongoose).lnk" "$INSTDIR\mongoose-3.0.exe" "" "$INSTDIR\www\images\ABGLogo48x48.ico" 0
  nsisStartMenu::RegenerateFolder "ABGames"
  CreateShortCut "$SMPROGRAMS\ABGames\Connect to Local ABG.lnk" "http://localhost:8080/" "" "$INSTDIR\www\images\ABGLogo48x48.ico" 0
  nsisStartMenu::RegenerateFolder "ABGames"
  CreateShortCut "$SMPROGRAMS\ABGames\Uninstall.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0

SectionEnd

;--------------------------------

; Uninstaller

Section "Uninstall"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ABGames"
  DeleteRegKey HKLM SOFTWARE\NSIS_ABGames

  ; Remove files and uninstaller
  RMDir "$INSTDIR\*.*"
  Delete "$INSTDIR\uninstall.exe"

  ; Remove shortcuts, if any
  Delete "$SMPROGRAMS\ABGames\*.*"

  ; Remove directories used
  RMDir "$SMPROGRAMS\ABGames"
  RMDir /r "$INSTDIR"

SectionEnd
