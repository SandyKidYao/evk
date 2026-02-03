import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import path from 'path';
import os from 'os';
import { getAllVariables, getAllTags } from '../../core/store.js';
import { syncToFile } from '../../core/sync.js';
import { expandPath } from '../../utils/file.js';
import { colors, icons, getTagColor } from '../theme.js';

const { createElement: h } = React;

const TARGETS = [
  { label: `${icons.bullet} ~/.zshrc`, value: 'zsh', path: path.join(os.homedir(), '.zshrc') },
  { label: `${icons.bullet} ~/.bashrc`, value: 'bash', path: path.join(os.homedir(), '.bashrc') },
  { label: `${icons.bullet} .env (current dir)`, value: 'env', path: path.join(process.cwd(), '.env') },
  { label: `${icons.edit} Custom path...`, value: 'custom', path: null }
];

// Tag badge component
function TagBadge({ tag }) {
  return h(Text, { color: getTagColor(tag) }, ` ${tag} `);
}

// Truncate value for display
function truncateValue(value, maxLen = 18) {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen - 3) + '...';
}

export default function SyncView({ onBack, showMessage, setFooterHints }) {
  const [vars, setVars] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [mode, setMode] = useState('selectTarget'); // selectTarget, custom, list
  const [customPath, setCustomPath] = useState('');
  const [targetPath, setTargetPath] = useState(null);
  const [targetLabel, setTargetLabel] = useState('');

  const loadData = (filterTag = null) => {
    try {
      const options = filterTag ? { tags: [filterTag] } : {};
      const data = getAllVariables(options);
      setVars(data);
      const tags = getAllTags();
      setAllTags(tags);
    } catch (err) {
      showMessage(err.message, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(selectedTag);
  }, [selectedTag]);

  // Update footer hints based on current state
  useEffect(() => {
    if (showTagFilter || mode === 'selectTarget' || mode === 'custom') {
      setFooterHints([]);
      return;
    }

    // list mode hints
    const hints = [];
    const entries = Object.entries(vars);
    if (entries.length > 0) {
      hints.push({ key: 'a', label: 'sync all' });
    }
    if (allTags.length > 0) {
      hints.push({ key: 'f', label: 'filter' });
    }
    if (selectedTag) {
      hints.push({ key: 'c', label: 'clear' });
    }
    setFooterHints(hints);
  }, [showTagFilter, mode, vars, allTags.length, selectedTag, setFooterHints]);

  useInput((input, key) => {
    if (syncing) return;

    if (showTagFilter) {
      if (key.escape) {
        setShowTagFilter(false);
      }
      return;
    }

    if (mode === 'custom') {
      if (key.escape) {
        setMode('selectTarget');
        setCustomPath('');
      }
      return;
    }

    if (mode === 'selectTarget') {
      if (key.escape) onBack();
      return;
    }

    // list mode
    if (key.escape) {
      setMode('selectTarget');
      setTargetPath(null);
      setTargetLabel('');
      setSelectedTag(null);
    }
    if (input === 'f' && allTags.length > 0) {
      setShowTagFilter(true);
    }
    if (input === 'c' && selectedTag) {
      setSelectedTag(null);
    }
    if (input === 'a' && Object.keys(vars).length > 0) {
      doSync(targetPath, vars);
    }
  });

  const doSync = (syncPath, varsToSync) => {
    setSyncing(true);

    try {
      const count = Object.keys(varsToSync).length;
      const syncResult = syncToFile(syncPath, varsToSync);
      showMessage(`Synced ${count} variable(s) to ${syncResult.path}`);

      if (syncResult.commented && syncResult.commented.length > 0) {
        setTimeout(() => {
          showMessage(`Conflicts commented: ${syncResult.commented.join(', ')}`, 'warning');
        }, 100);
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
    setSyncing(false);
  };

  const handleTargetSelect = (item) => {
    if (item.value === 'custom') {
      setMode('custom');
      return;
    }

    const target = TARGETS.find(t => t.value === item.value);
    if (!target || !target.path) return;

    setTargetPath(target.path);
    setTargetLabel(target.label);
    setMode('list');
  };

  const handleCustomSubmit = () => {
    if (!customPath.trim()) {
      showMessage('Please enter a path', 'error');
      return;
    }

    const resolved = expandPath(customPath.trim());
    setTargetPath(resolved);
    setTargetLabel(customPath.trim());
    setMode('list');
    setCustomPath('');
  };

  const handleVarSelect = (item) => {
    // Sync single variable
    const singleVar = { [item.value]: vars[item.value] };
    doSync(targetPath, singleVar);
  };

  if (loading) {
    return h(Box, { padding: 1 },
      h(Text, { color: colors.accent },
        h(Spinner, { type: 'dots' }),
        ' Loading...'
      )
    );
  }

  if (syncing) {
    return h(Box, { padding: 1 },
      h(Text, { color: colors.accent },
        h(Spinner, { type: 'dots' }),
        ' Syncing...'
      )
    );
  }

  // Tag filter view
  if (showTagFilter) {
    const tagItems = [
      { label: `${icons.bullet} All (Clear Filter)`, value: null },
      ...allTags.map(tag => ({ label: `${icons.tags} ${tag}`, value: tag }))
    ];

    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.primary }, `${icons.tags} Select Tag`)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.primary,
        paddingX: 1
      },
        h(SelectInput, {
          items: tagItems,
          onSelect: (item) => {
            setSelectedTag(item.value);
            setShowTagFilter(false);
          }
        })
      )
    );
  }

  // Custom path input mode
  if (mode === 'custom') {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.primary }, `${icons.sync} Custom Path`)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.accent,
        paddingX: 2,
        paddingY: 1
      },
        h(Box, { marginBottom: 1 },
          h(Text, { color: colors.textDim }, 'Enter file path:')
        ),
        h(Box, {
          borderStyle: 'round',
          borderColor: colors.border,
          paddingX: 1
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

  // Select target mode
  if (mode === 'selectTarget') {
    return h(Box, { flexDirection: 'column' },
      h(Box, { marginBottom: 1 },
        h(Text, { bold: true, color: colors.primary }, `${icons.sync} Select Target`)
      ),
      h(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: colors.border,
        paddingX: 2,
        paddingY: 1
      },
        h(Box, { marginBottom: 1 },
          h(Text, { color: colors.textDim }, 'Select target file to sync to:')
        ),
        h(SelectInput, { items: TARGETS, onSelect: handleTargetSelect })
      )
    );
  }

  // List mode - show variables to sync
  const entries = Object.entries(vars);
  const varsMap = vars;

  // Title bar
  const TitleBar = () => h(Box, { marginBottom: 1 },
    h(Text, { bold: true, color: colors.primary }, `${icons.sync} Sync to `),
    h(Text, { color: colors.accent }, targetLabel),
    h(Text, { color: colors.textDim }, ` (${entries.length})`),
    selectedTag && h(Text, { color: colors.accent }, ` [${selectedTag}]`)
  );

  if (entries.length === 0) {
    return h(Box, { flexDirection: 'column' },
      h(TitleBar),
      h(Box, {
        borderStyle: 'round',
        borderColor: colors.border,
        paddingX: 2,
        paddingY: 1
      },
        h(Text, { color: colors.warning },
          selectedTag ? `${icons.warning} No variables with tag "${selectedTag}"` : `${icons.info} No variables to sync`
        )
      )
    );
  }

  // Build list items
  const items = entries.map(([key]) => ({
    label: key,
    value: key
  }));

  const itemComponent = ({ isSelected, label }) => {
    const data = varsMap[label];
    if (!data) return h(Text, null, label);

    const valueDisplay = truncateValue(data.value);
    const sortedTags = (data.tags || []).slice().sort();

    return h(Box, { width: '100%' },
      h(Box, { width: 20 },
        h(Text, {
          color: isSelected ? colors.accent : colors.text,
          bold: isSelected
        }, label)
      ),
      h(Box, { width: 22 },
        h(Text, {
          color: isSelected ? colors.primaryLight : colors.textDim
        }, valueDisplay)
      ),
      h(Box, null,
        ...sortedTags.map((tag, i) =>
          h(TagBadge, { key: i, tag })
        )
      )
    );
  };

  const indicatorComponent = ({ isSelected }) =>
    h(Text, { color: isSelected ? colors.accent : colors.textDim },
      isSelected ? `${icons.arrow} ` : '  '
    );

  return h(Box, { flexDirection: 'column' },
    h(TitleBar),
    h(Box, {
      flexDirection: 'column',
      borderStyle: 'round',
      borderColor: colors.border,
      paddingX: 1
    },
      // Header row
      h(Box, { marginBottom: 1, paddingX: 1 },
        h(Text, { color: colors.textMuted, bold: true }, '  KEY'.padEnd(22)),
        h(Text, { color: colors.textMuted, bold: true }, 'VALUE'.padEnd(22)),
        h(Text, { color: colors.textMuted, bold: true }, 'TAGS')
      ),
      h(SelectInput, {
        items,
        onSelect: handleVarSelect,
        indicatorComponent,
        itemComponent
      })
    )
  );
}
