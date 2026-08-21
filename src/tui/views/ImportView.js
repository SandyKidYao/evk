import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import path from 'path';
import os from 'os';
import { ensureStore, addVariable, getVariable } from '../../core/store.js';
import { parseVariablesFromFile } from '../../core/import.js';
import { expandPath } from '../../utils/file.js';
import { colors, icons, getTagColor } from '../theme.js';
import useTerminalSize from '../hooks/useTerminalSize.js';
import { truncate } from '../layout.js';

const { createElement: h } = React;

const SOURCES = [
  { label: `${icons.bullet} ~/.zshrc`, value: 'zsh', path: path.join(os.homedir(), '.zshrc') },
  { label: `${icons.bullet} ~/.bashrc`, value: 'bash', path: path.join(os.homedir(), '.bashrc') },
  { label: `${icons.bullet} .env (current dir)`, value: 'env', path: path.join(process.cwd(), '.env') },
  { label: `${icons.edit} Custom path...`, value: 'custom', path: null }
];

export default function ImportView({ onBack, showMessage, setFooterHints }) {
  const { columns } = useTerminalSize();
  // Preview rows: app padding (2) + border (2) + paddingX (4) + '+ ' prefix (2)
  const previewUsable = Math.max(36, columns - 10);
  const previewKeyWidth = Math.min(48, Math.max(12, Math.floor(previewUsable * 0.4)));
  const previewValueMax = Math.max(16, previewUsable - previewKeyWidth);
  // Conflict view: 'Current: ' label (9) + surrounding padding/borders
  const conflictValueMax = Math.max(24, columns - 20);
  const [mode, setMode] = useState('selectSource'); // selectSource, custom, tagInput, preview, confirmConflict
  const [customPath, setCustomPath] = useState('');
  const [sourcePath, setSourcePath] = useState(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const [parsedVars, setParsedVars] = useState({});
  const [fileType, setFileType] = useState('');
  const [tags, setTags] = useState('');
  const [toImport, setToImport] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [conflictIndex, setConflictIndex] = useState(0);
  const [conflictDecisions, setConflictDecisions] = useState({}); // { key: 'overwrite' | 'skip' }
  const [unchanged, setUnchanged] = useState([]); // variables with same value, auto-skipped
  const [importing, setImporting] = useState(false);

  // Update footer hints
  useEffect(() => {
    if (mode === 'selectSource' || mode === 'custom' || mode === 'tagInput' || mode === 'confirmConflict') {
      setFooterHints([]);
      return;
    }
    if (mode === 'preview') {
      const hints = [];
      if (toImport.length > 0 || Object.values(conflictDecisions).some(d => d === 'overwrite')) {
        hints.push({ key: 'Enter', label: 'import selected' });
      }
      setFooterHints(hints);
    }
  }, [mode, toImport.length, conflictDecisions, setFooterHints]);

  const parseTags = (tagStr) => {
    return tagStr ? tagStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  };

  const detectConflictsForPreview = (vars, tagList) => {
    ensureStore();
    const newVars = [];
    const conflictVars = [];
    const sameValueVars = [];

    for (const [key, value] of Object.entries(vars)) {
      // Always use exact tag matching (key + tags)
      // When tagList=[], only matches entries with empty tags
      const existing = getVariable(key, { tags: tagList });

      if (existing !== null) {
        // If value is identical, auto-skip without prompting
        if (existing.value === value) {
          sameValueVars.push({ key, value, existing });
        } else {
          conflictVars.push({ key, value, existing });
        }
      } else {
        newVars.push({ key, value });
      }
    }

    return { newVars, conflictVars, sameValueVars };
  };

  const parseAndPreview = (filePath, tagStr) => {
    const resolved = expandPath(filePath);
    const { vars, type, error } = parseVariablesFromFile(resolved);

    if (error) {
      showMessage(error, 'error');
      setMode('selectSource');
      return;
    }

    if (Object.keys(vars).length === 0) {
      showMessage('No variables found in file', 'warning');
      setMode('selectSource');
      return;
    }

    setParsedVars(vars);
    setFileType(type);

    const tagList = parseTags(tagStr);
    const { newVars, conflictVars, sameValueVars } = detectConflictsForPreview(vars, tagList);

    setToImport(newVars);
    setConflicts(conflictVars);
    setUnchanged(sameValueVars);
    setConflictDecisions({});

    if (conflictVars.length > 0) {
      setConflictIndex(0);
      setMode('confirmConflict');
    } else {
      setMode('preview');
    }
  };

  const doImport = () => {
    setImporting(true);
    const tagList = parseTags(tags);

    try {
      ensureStore();
      let imported = 0;
      let updated = 0;

      // Import new variables
      for (const { key, value } of toImport) {
        addVariable(key, value, { tags: tagList, description: '' });
        imported++;
      }

      // Import overwritten conflicts
      for (const { key, value } of conflicts) {
        if (conflictDecisions[key] === 'overwrite') {
          addVariable(key, value, { tags: tagList, description: '' });
          updated++;
        }
      }

      const skipped = conflicts.length - updated;
      const parts = [];
      if (imported > 0) parts.push(`${imported} imported`);
      if (updated > 0) parts.push(`${updated} updated`);
      if (skipped > 0) parts.push(`${skipped} skipped`);
      if (unchanged.length > 0) parts.push(`${unchanged.length} unchanged`);

      showMessage(parts.join(', '));
    } catch (err) {
      showMessage(err.message, 'error');
    }

    setImporting(false);
    onBack();
  };

  useInput((input, key) => {
    if (importing) return;

    if (mode === 'custom') {
      if (key.escape) {
        setMode('selectSource');
        setCustomPath('');
      }
      return;
    }

    if (mode === 'tagInput') {
      if (key.escape) {
        setMode('selectSource');
        setTags('');
        setSourcePath(null);
      }
      return;
    }

    if (mode === 'selectSource') {
      if (key.escape) onBack();
      return;
    }

    if (mode === 'confirmConflict') {
      if (key.escape) {
        setMode('selectSource');
      }
      return;
    }

    if (mode === 'preview') {
      if (key.escape) {
        setMode('selectSource');
        setSourcePath(null);
        setToImport([]);
        setConflicts([]);
      }
      if (key.return) {
        const hasAny = toImport.length > 0 ||
          Object.values(conflictDecisions).some(d => d === 'overwrite');
        if (hasAny) {
          doImport();
        }
      }
    }
  });

  const handleSourceSelect = (item) => {
    if (item.value === 'custom') {
      setMode('custom');
      return;
    }

    const source = SOURCES.find(s => s.value === item.value);
    if (!source || !source.path) return;

    setSourcePath(source.path);
    setSourceLabel(source.label);
    setMode('tagInput');
  };

  const handleCustomSubmit = () => {
    if (!customPath.trim()) {
      showMessage('Please enter a path', 'error');
      return;
    }

    const resolved = expandPath(customPath.trim());
    setSourcePath(resolved);
    setSourceLabel(customPath.trim());
    setCustomPath('');
    setMode('tagInput');
  };

  const handleTagSubmit = () => {
    parseAndPreview(sourcePath, tags);
  };

  const handleConflictDecision = (item) => {
    const conflict = conflicts[conflictIndex];
    const newDecisions = { ...conflictDecisions, [conflict.key]: item.value };
    setConflictDecisions(newDecisions);

    if (conflictIndex < conflicts.length - 1) {
      setConflictIndex(conflictIndex + 1);
    } else {
      setMode('preview');
    }
  };

  if (importing) {
    return h(Box, { padding: 1 },
      h(Text, { color: colors.accent },
        h(Spinner, { type: 'dots' }),
        ' Importing...'
      )
    );
  }

  // Select source mode
  if (mode === 'selectSource') {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.primary }, `${icons.import || '📥'} Select Source`)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.border,
        paddingX: 2,
        paddingY: 1
      },
        h(Box, { marginBottom: 1 },
          h(Text, { color: colors.textDim }, 'Select file to import from:')
        ),
        h(SelectInput, { items: SOURCES, onSelect: handleSourceSelect })
      )
    );
  }

  // Custom path input
  if (mode === 'custom') {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.primary }, `${icons.import || '📥'} Custom Path`)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.accent,
        paddingX: 2,
        paddingY: 1
      },
        h(Box, { marginBottom: 1 },
          h(Text, { color: colors.textDim }, 'Enter source file path:')
        ),
        h(Box, {
          borderStyle: 'round',
          borderColor: colors.border,
          paddingX: 1,
          alignSelf: 'stretch'
        },
          h(TextInput, {
            value: customPath,
            onChange: setCustomPath,
            onSubmit: handleCustomSubmit,
            placeholder: '~/path/to/file or ./relative/path'
          })
        )
      )
    );
  }

  // Tag input
  if (mode === 'tagInput') {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.primary }, `${icons.import || '📥'} Import from `),
        h(Text, { color: colors.accent }, sourceLabel)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.accent,
        paddingX: 2,
        paddingY: 1
      },
        h(Box, { marginBottom: 1 },
          h(Text, { color: colors.textDim }, 'Tags to apply (comma-separated, leave empty for none):')
        ),
        h(Box, {
          borderStyle: 'round',
          borderColor: colors.border,
          paddingX: 1,
          alignSelf: 'stretch'
        },
          h(TextInput, {
            value: tags,
            onChange: setTags,
            onSubmit: handleTagSubmit,
            placeholder: 'e.g. dev,api'
          })
        )
      )
    );
  }

  // Conflict confirmation - one at a time
  if (mode === 'confirmConflict') {
    const conflict = conflicts[conflictIndex];
    const conflictItems = [
      { label: 'Skip (keep existing)', value: 'skip' },
      { label: 'Overwrite with new value', value: 'overwrite' }
    ];

    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.warning }, `${icons.warning} Conflict ${conflictIndex + 1}/${conflicts.length}`)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.warning,
        paddingX: 2,
        paddingY: 1
      },
        h(Box, { flexDirection: 'column', marginBottom: 1 },
          h(Text, { bold: true, color: colors.text }, conflict.key),
          h(Box, { marginTop: 1 },
            h(Text, { color: colors.textDim }, 'Current: '),
            h(Text, { color: colors.error }, truncate(conflict.existing.value, conflictValueMax))
          ),
          h(Box, null,
            h(Text, { color: colors.textDim }, 'New:     '),
            h(Text, { color: colors.success }, truncate(conflict.value, conflictValueMax))
          )
        ),
        h(SelectInput, { items: conflictItems, onSelect: handleConflictDecision })
      )
    );
  }

  // Preview mode
  const totalToImport = toImport.length + Object.values(conflictDecisions).filter(d => d === 'overwrite').length;
  const totalSkipped = Object.values(conflictDecisions).filter(d => d === 'skip').length;
  const totalUnchanged = unchanged.length;

  return h(Box, { flexDirection: 'column' },
    h(Box, { marginBottom: 1 },
      h(Text, { bold: true, color: colors.primary }, `${icons.import || '📥'} Import Preview`),
      h(Text, { color: colors.textDim }, ` — ${sourceLabel} (${fileType})`)
    ),
    h(Box, {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: colors.border,
      paddingX: 2,
      paddingY: 1
    },
      // Summary
      h(Box, { marginBottom: 1 },
        h(Text, { color: colors.success }, `${totalToImport} to import`),
        totalSkipped > 0 && h(Text, { color: colors.warning }, `  ${totalSkipped} skipped`),
        totalUnchanged > 0 && h(Text, { color: colors.textDim }, `  ${totalUnchanged} unchanged`)
      ),

      // New variables
      ...toImport.map(({ key, value }) =>
        h(Box, { key: `new-${key}` },
          h(Text, { color: colors.success }, '+ '),
          h(Box, { width: previewKeyWidth },
            h(Text, { color: colors.text }, truncate(key, previewKeyWidth - 2))
          ),
          h(Text, { color: colors.textDim }, truncate(value, previewValueMax))
        )
      ),

      // Conflict decisions
      ...conflicts.map(({ key, value }) => {
        const decision = conflictDecisions[key] || 'skip';
        const isOverwrite = decision === 'overwrite';
        return h(Box, { key: `conflict-${key}` },
          h(Text, { color: isOverwrite ? colors.warning : colors.textMuted },
            isOverwrite ? '~ ' : '- '
          ),
          h(Box, { width: previewKeyWidth },
            h(Text, { color: isOverwrite ? colors.text : colors.textMuted }, truncate(key, previewKeyWidth - 2))
          ),
          h(Text, { color: isOverwrite ? colors.warning : colors.textMuted },
            isOverwrite ? truncate(value, previewValueMax) : '(skipped)'
          )
        );
      }),

      // Unchanged variables (same value, auto-skipped)
      ...unchanged.map(({ key, value }) =>
        h(Box, { key: `unchanged-${key}` },
          h(Text, { color: colors.textMuted }, '= '),
          h(Box, { width: previewKeyWidth },
            h(Text, { color: colors.textMuted }, truncate(key, previewKeyWidth - 2))
          ),
          h(Text, { color: colors.textMuted }, '(unchanged)')
        )
      ),

      // Press enter hint
      totalToImport > 0 && h(Box, { marginTop: 1 },
        h(Text, { color: colors.textDim }, 'Press '),
        h(Text, { color: colors.accent }, 'Enter'),
        h(Text, { color: colors.textDim }, ' to import')
      ),
      totalToImport === 0 && h(Box, { marginTop: 1 },
        h(Text, { color: colors.textDim }, 'Nothing to import. Press '),
        h(Text, { color: colors.accent }, 'Esc'),
        h(Text, { color: colors.textDim }, ' to go back.')
      )
    )
  );
}
