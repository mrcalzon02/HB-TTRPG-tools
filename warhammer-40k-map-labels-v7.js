(() => {
  'use strict';

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function rectangle(centerX, centerY, width, height) {
    return {
      left: centerX - width / 2,
      right: centerX + width / 2,
      top: centerY - height / 2,
      bottom: centerY + height / 2
    };
  }

  function padded(rect, amount = 5) {
    return {
      left: rect.left - amount,
      right: rect.right + amount,
      top: rect.top - amount,
      bottom: rect.bottom + amount
    };
  }

  function overlaps(first, second) {
    return !(
      first.right <= second.left ||
      first.left >= second.right ||
      first.bottom <= second.top ||
      first.top >= second.bottom
    );
  }

  function nearest(x, y, rect) {
    return {
      x: clamp(x, rect.left, rect.right),
      y: clamp(y, rect.top, rect.bottom)
    };
  }

  function distanceToRectangle(x, y, rect) {
    const edge = nearest(x, y, rect);
    return Math.hypot(edge.x - x, edge.y - y);
  }

  function edgeGroup(items, side, width, height, topInset) {
    if (!items.length) return [];
    const bottomInset = 10;
    const nominalHeight = 31;
    const capacity = Math.max(1, Math.floor((height - topInset - bottomInset) / nominalHeight));
    const laneCount = clamp(Math.ceil(items.length / capacity), 1, 3);
    const sorted = [...items].sort((first, second) => first.y - second.y);
    const lanes = Array.from({ length: laneCount }, () => []);
    sorted.forEach((item, index) => {
      lanes[Math.min(laneCount - 1, Math.floor(index / capacity))].push(item);
    });

    const placed = [];
    lanes.forEach((laneItems, laneIndex) => {
      if (!laneItems.length) return;
      const available = Math.max(1, height - topInset - bottomInset);
      const labelHeight = laneItems.reduce((sum, item) => sum + item.labelHeight, 0);
      const gap = laneItems.length > 1
        ? clamp((available - labelHeight) / (laneItems.length - 1), 2, 8)
        : 0;
      let cursor = topInset;

      for (const item of laneItems) {
        const ideal = clamp(
          item.y,
          topInset + item.labelHeight / 2,
          height - bottomInset - item.labelHeight / 2
        );
        let centerY = Math.max(ideal, cursor + item.labelHeight / 2);
        const laneOffset = laneIndex * 224;
        const centerX = side === 'left'
          ? 10 + laneOffset + item.labelWidth / 2
          : width - 10 - laneOffset - item.labelWidth / 2;
        let rect = rectangle(centerX, centerY, item.labelWidth, item.labelHeight);
        if (rect.bottom > height - bottomInset) {
          centerY -= rect.bottom - (height - bottomInset);
          rect = rectangle(centerX, centerY, item.labelWidth, item.labelHeight);
        }
        placed.push({
          ...item,
          cx: centerX,
          cy: centerY,
          rect,
          placement: `edge-${side}-${laneIndex}`
        });
        cursor = rect.bottom + gap;
      }
    });
    return placed;
  }

  function selectedLabel(item, occupied, width, height, topInset) {
    const radii = [34, 48, 66, 88, 112];
    const angles = [-35, 35, -145, 145, -80, 80, 0, 180];
    for (const radius of radii) {
      for (const degrees of angles) {
        const angle = degrees * Math.PI / 180;
        const centerX = item.x + Math.cos(angle) * (radius + item.labelWidth * 0.18);
        const centerY = item.y + Math.sin(angle) * (radius + item.labelHeight * 0.18);
        const rect = rectangle(centerX, centerY, item.labelWidth, item.labelHeight);
        const inside = rect.left >= 7 &&
          rect.right <= width - 7 &&
          rect.top >= topInset &&
          rect.bottom <= height - 7;
        if (!inside) continue;
        if (occupied.some(existing => overlaps(padded(rect), existing))) continue;
        return { ...item, cx: centerX, cy: centerY, rect, placement: 'local-selected' };
      }
    }
    const side = item.x <= width / 2 ? 'left' : 'right';
    return edgeGroup([item], side, width, height, topInset)[0] || null;
  }

  function localClearance(item) {
    const minimum = { star: 72, planet: 58, moon: 42, 'asteroid-belt': 36, 'orbital-station': 42, 'fleet-anchorage': 44 }[item.kind] || 46;
    return Math.max(minimum, Number(item.avoidRadius || 0) + Math.max(14, Number(item.labelBuffer || 18)));
  }

  function localLabel(item, occupied, width, height, topInset) {
    const clearance = localClearance(item);
    const radii = [clearance, clearance + 16, clearance + 36, clearance + 60, clearance + 88, clearance + 120, clearance + 156];
    const angles = [-28, 28, -62, 62, -118, 118, -152, 152, -90, 90, 0, 180];
    for (const radius of radii) {
      for (const degrees of angles) {
        const angle = degrees * Math.PI / 180;
        const centerX = item.x + Math.cos(angle) * (radius + Math.min(24, item.labelWidth * 0.12));
        const centerY = item.y + Math.sin(angle) * (radius + Math.min(12, item.labelHeight * 0.1));
        const rect = rectangle(centerX, centerY, item.labelWidth, item.labelHeight);
        const inside = rect.left >= 7 &&
          rect.right <= width - 7 &&
          rect.top >= topInset &&
          rect.bottom <= height - 7;
        if (!inside) continue;
        if (distanceToRectangle(item.x, item.y, rect) < clearance) continue;
        if (occupied.some(existing => overlaps(padded(rect, 6), existing))) continue;
        return { ...item, cx: centerX, cy: centerY, rect, placement: 'local-system' };
      }
    }
    return null;
  }

  function edgeLocalLabel(item, occupied, width, height, topInset) {
    const bottomInset = 10;
    const sides = item.x <= width / 2 ? ['left', 'right'] : ['right', 'left'];
    const step = Math.max(30, item.labelHeight + 8);
    const verticalOffsets = [0];
    const maximumSteps = Math.ceil(Math.max(1, height - topInset - bottomInset) / step);
    for (let index = 1; index <= maximumSteps; index += 1) verticalOffsets.push(index, -index);
    for (const side of sides) {
      for (let lane = 0; lane < 3; lane += 1) {
        const laneOffset = lane * 224;
        const centerX = side === 'left'
          ? 10 + laneOffset + item.labelWidth / 2
          : width - 10 - laneOffset - item.labelWidth / 2;
        for (const offset of verticalOffsets) {
          const centerY = clamp(
            item.y + offset * step,
            topInset + item.labelHeight / 2,
            height - bottomInset - item.labelHeight / 2
          );
          const rect = rectangle(centerX, centerY, item.labelWidth, item.labelHeight);
          if (rect.left < 7 || rect.right > width - 7) continue;
          if (occupied.some(existing => overlaps(padded(rect, 6), existing))) continue;
          return { ...item, cx: centerX, cy: centerY, rect, placement: `local-edge-${side}-${lane}` };
        }
      }
    }
    const side = item.x <= width / 2 ? 'left' : 'right';
    return edgeGroup([item], side, width, height, topInset)[0] || null;
  }

  function placeLocal(items, width, height, topInset) {
    const placed = [];
    const occupied = [];
    const deferred = [];
    const ordered = [...items].sort((first, second) =>
      (Number(second.priority || 0) - Number(first.priority || 0)) ||
      (first.y - second.y) ||
      (first.x - second.x)
    );
    for (const item of ordered) {
      const placement = localLabel(item, occupied, width, height, topInset);
      if (!placement) { deferred.push(item); continue; }
      placed.push(placement);
      occupied.push(padded(placement.rect, 6));
    }
    for (const item of deferred) {
      const placement = edgeLocalLabel(item, occupied, width, height, topInset);
      if (!placement) continue;
      placed.push(placement);
      occupied.push(padded(placement.rect, 6));
    }
    return placed;
  }

  function place(left, right, selected, width, height, topInset) {
    const placed = [
      ...edgeGroup(left, 'left', width, height, topInset),
      ...edgeGroup(right, 'right', width, height, topInset)
    ];
    if (selected) {
      const occupied = placed.map(item => padded(item.rect, 5));
      const selection = selectedLabel(selected, occupied, width, height, topInset);
      if (selection) placed.push(selection);
    }
    return placed;
  }

  window.CafarronMapLabelsV7 = Object.freeze({ place, placeLocal, nearest });
})();
