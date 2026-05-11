export const en = {
  appName: 'Logikku',
  tagline: 'Sudoku, every variant.',

  home: {
    classicHeader: 'Classic Sudoku',
    continueLabel: 'Continue',
    settings: 'Settings',
    stats: 'Stats',
  },

  difficulty: {
    'very-easy': 'Very Easy',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    tough: 'Tough',
    expert: 'Expert',
    diabolical: 'Diabolical',
  },

  play: {
    loading: 'Loading…',
    solved: 'Solved!',
    new: 'New',
    undo: 'Undo',
    redo: 'Redo',
    erase: 'Erase',
    modeValue: 'Value',
    modePencil: 'Pencil',
    back: '← Back',
  },

  settings: {
    title: 'Settings',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    strictMode: 'Strict mode',
    strictModeHint: 'Wrong entries lock for 5 seconds.',
    highlightConflicts: 'Highlight conflicts',
    highlightPeers: 'Highlight peers',
    pencilAutoClean: 'Auto-clean pencil marks',
    pencilAutoCleanHint: 'Remove pencil marks for peers when you place a digit.',
    dataSection: 'Your data',
    backup: 'Save backup',
    backupHint: 'Downloads a JSON file with all games, settings, and stats.',
    restore: 'Restore from file',
    restoreHint: 'Replaces all current data with the backup contents.',
    clear: 'Clear all data',
    clearHint: 'Deletes all games, settings, and stats from this device.',
    confirmRestore: 'Restore will REPLACE your current games, settings, and stats. Continue?',
    confirmClearFirst: 'Delete all your games, settings, and stats?',
    confirmClearSecond: 'Are you absolutely sure? This cannot be undone.',
    restoreError: 'That file is not a valid Logikku backup.',
    restoreOk: 'Backup restored.',
  },

  stats: {
    title: 'Stats',
    noData: 'No completions yet. Solve a puzzle to see stats here.',
    headerBand: 'Variant / Difficulty',
    headerCompleted: 'Completed',
    headerBest: 'Best',
    headerAverage: 'Average',
    reset: 'Reset stats',
    confirmReset: 'Reset all stats to zero?',
  },
} as const

export type Strings = typeof en

export const t = en
