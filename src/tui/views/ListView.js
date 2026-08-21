import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { getAllVariables, getAllTags } from '../../core/store.js';
import { colors, icons, getTagColor } from '../theme.js';
import useTerminalSize from '../hooks/useTerminalSize.js';
import { getTableLayout, truncate } from '../layout.js';

const { createElement: h } = React;

// Tag badge component
function TagBadge({ tag }) {
  return h(Text, { color: getTagColor(tag) }, ` ${tag} `);
}

export default function ListView({ onBack, onSelect, onAdd, showMessage, setFooterHints }) {
  const { columns } = useTerminalSize();
  const { keyWidth, valueWidth } = getTableLayout(columns);
  const [vars, setVars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showTagFilter, setShowTagFilter] = useState(false);

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
    if (showTagFilter) {
      setFooterHints([]);
      return;
    }

    const hints = [
      { key: 'a', label: 'add' }
    ];
    if (allTags.length > 0) {
      hints.push({ key: 'f', label: 'filter' });
    }
    if (selectedTag) {
      hints.push({ key: 'c', label: 'clear' });
    }
    setFooterHints(hints);
  }, [showTagFilter, allTags.length, selectedTag, setFooterHints]);

  useInput((input, key) => {
    if (showTagFilter) {
      if (key.escape) {
        setShowTagFilter(false);
      }
      return;
    }
    if (key.escape) onBack();
    if (input === 'a') onAdd();
    if (input === 'f' && allTags.length > 0) {
      setShowTagFilter(true);
    }
    if (input === 'c' && selectedTag) {
      setSelectedTag(null);
    }
  });

  if (loading) {
    return h(Box, { padding: 1 },
      h(Text, { color: colors.accent },
        h(Spinner, { type: 'dots' }),
        ' Loading...'
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

  // Title bar
  const TitleBar = () => h(Box, { marginBottom: 1 },
    h(Text, { bold: true, color: colors.primary }, `${icons.list} Variables `),
    h(Text, { color: colors.textDim }, `(${vars.length})`),
    selectedTag && h(Text, { color: colors.accent }, ` [${selectedTag}]`)
  );

  if (vars.length === 0) {
    return h(Box, { flexDirection: 'column' },
      h(TitleBar),
      h(Box, {
        borderStyle: 'round',
        borderColor: colors.border,
        paddingX: 2,
        paddingY: 1
      },
        h(Text, { color: colors.warning },
          selectedTag ? `${icons.warning} No variables with tag "${selectedTag}"` : `${icons.info} No variables found`
        )
      )
    );
  }

  // Build list items - use id as value for unique identification
  const items = vars.map(entry => ({
    label: entry.key,
    value: entry.id,
    data: entry
  }));

  const itemComponent = ({ isSelected, data }) => {
    if (!data) return h(Text, null, '(unknown)');

    const valueDisplay = truncate(data.value, valueWidth - 2);
    const sortedTags = (data.tags || []).slice().sort();

    return h(Box, { width: '100%' },
      h(Box, { width: keyWidth },
        h(Text, {
          color: isSelected ? colors.accent : colors.text,
          bold: isSelected
        }, truncate(data.key, keyWidth - 2))
      ),
      h(Box, { width: valueWidth },
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
      // Header row - widths mirror the item rows (indicator + key + value)
      h(Box, { marginBottom: 1 },
        h(Text, { color: colors.textMuted, bold: true }, '  KEY'.padEnd(keyWidth + 2)),
        h(Text, { color: colors.textMuted, bold: true }, 'VALUE'.padEnd(valueWidth)),
        h(Text, { color: colors.textMuted, bold: true }, 'TAGS')
      ),
      h(SelectInput, {
        items,
        onSelect: (item) => onSelect(item.value),
        indicatorComponent,
        itemComponent
      })
    )
  );
}
