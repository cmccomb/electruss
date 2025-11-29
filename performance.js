/**
 * Compute structural performance metrics for a 2D truss.
 * Nodes represent joints and edges represent prismatic members with axial behavior.
 * Loads are applied at nodes; fixed supports constrain translational degrees of freedom.
 */

/**
 * @typedef {Object} FixedState
 * @property {boolean} x
 * @property {boolean} y
 */

/**
 * @typedef {Object} NodeDefinition
 * @property {number|string} id
 * @property {number} x
 * @property {number} y
 * @property {FixedState} fixed
 * @property {{ fx?: number, fy?: number }} [load]
 */

/**
 * @typedef {Object} EdgeDefinition
 * @property {number|string} id
 * @property {number|string} from
 * @property {number|string} to
 * @property {number} area
 * @property {number} elastic_modulus
 */

/**
 * @typedef {Object} TrussPerformance
 * @property {Map<number|string, { dx: number, dy: number }>} displacements
 * @property {Map<number|string, { rx: number, ry: number }>} reactions
 * @property {{ id: number|string, axialForce: number }[]} memberForces
 * @property {number} maxDisplacement
 */

const MIN_LENGTH_TOLERANCE = 1e-9;
const PIVOT_TOLERANCE = 1e-12;

function assertFinite(value, message) {
  if (!Number.isFinite(value)) {
    throw new Error(message);
  }
}

function buildNodeIndex(nodes) {
  const nodeIndex = new Map();
  nodes.forEach((node, idx) => {
    assertFinite(node.x, 'Node x coordinate must be finite.');
    assertFinite(node.y, 'Node y coordinate must be finite.');
    if (
      !node.fixed ||
      typeof node.fixed.x !== 'boolean' ||
      typeof node.fixed.y !== 'boolean'
    ) {
      throw new Error('Nodes must define fixed.x and fixed.y booleans.');
    }
    nodeIndex.set(node.id, { ...node, index: idx });
  });
  return nodeIndex;
}

function initializeMatrix(size) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );
}

function addStiffnessContribution(matrix, i, j, value) {
  matrix[i][j] += value;
}

function assembleGlobalStiffness(nodes, edges, nodeIndex) {
  const dofCount = nodes.length * 2;
  const matrix = initializeMatrix(dofCount);

  edges.forEach((edge) => {
    const start = nodeIndex.get(edge.from);
    const end = nodeIndex.get(edge.to);

    if (!start || !end) {
      throw new Error('All edges must reference valid nodes.');
    }

    assertFinite(edge.area, 'Edge area must be finite.');
    assertFinite(edge.elastic_modulus, 'Edge elastic modulus must be finite.');

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    if (length <= MIN_LENGTH_TOLERANCE) {
      throw new Error('Edge length must be greater than zero.');
    }

    const c = dx / length;
    const s = dy / length;
    const stiffness = (edge.elastic_modulus * edge.area) / length;
    const kLocal = [
      [c * c, c * s, -c * c, -c * s],
      [c * s, s * s, -c * s, -s * s],
      [-c * c, -c * s, c * c, c * s],
      [-c * s, -s * s, c * s, s * s],
    ].map((row) => row.map((value) => value * stiffness));

    const dofMap = [
      start.index * 2,
      start.index * 2 + 1,
      end.index * 2,
      end.index * 2 + 1,
    ];

    for (let localRow = 0; localRow < 4; localRow += 1) {
      for (let localCol = 0; localCol < 4; localCol += 1) {
        const globalRow = dofMap[localRow];
        const globalCol = dofMap[localCol];
        addStiffnessContribution(
          matrix,
          globalRow,
          globalCol,
          kLocal[localRow][localCol]
        );
      }
    }
  });

  return matrix;
}

function buildLoadVector(nodes) {
  const vector = Array.from({ length: nodes.length * 2 }, () => 0);
  nodes.forEach((node, idx) => {
    const load = node.load || {};
    const fx = load.fx ?? 0;
    const fy = load.fy ?? 0;
    assertFinite(fx, 'Node load fx must be finite.');
    assertFinite(fy, 'Node load fy must be finite.');
    vector[idx * 2] = fx;
    vector[idx * 2 + 1] = fy;
  });
  return vector;
}

function solveLinearSystem(matrix, vector) {
  const size = vector.length;
  const a = matrix.map((row) => row.slice());
  const b = vector.slice();

  for (let k = 0; k < size; k += 1) {
    let pivotRow = k;
    let maxValue = Math.abs(a[k][k]);
    for (let i = k + 1; i < size; i += 1) {
      const candidate = Math.abs(a[i][k]);
      if (candidate > maxValue) {
        maxValue = candidate;
        pivotRow = i;
      }
    }

    if (maxValue < PIVOT_TOLERANCE) {
      throw new Error('Stiffness matrix is singular; structure is unstable.');
    }

    if (pivotRow !== k) {
      [a[k], a[pivotRow]] = [a[pivotRow], a[k]];
      [b[k], b[pivotRow]] = [b[pivotRow], b[k]];
    }

    for (let i = k + 1; i < size; i += 1) {
      const factor = a[i][k] / a[k][k];
      for (let j = k; j < size; j += 1) {
        a[i][j] -= factor * a[k][j];
      }
      b[i] -= factor * b[k];
    }
  }

  const solution = Array.from({ length: size }, () => 0);
  for (let i = size - 1; i >= 0; i -= 1) {
    let sum = b[i];
    for (let j = i + 1; j < size; j += 1) {
      sum -= a[i][j] * solution[j];
    }
    solution[i] = sum / a[i][i];
  }

  return solution;
}

function extractMatrix(matrix, indices) {
  return indices.map((rowIdx) =>
    indices.map((colIdx) => matrix[rowIdx][colIdx])
  );
}

function extractVector(vector, indices) {
  return indices.map((idx) => vector[idx]);
}

function computeMemberForces(edges, nodeIndex, displacements) {
  return edges.map((edge) => {
    const start = nodeIndex.get(edge.from);
    const end = nodeIndex.get(edge.to);
    if (!start || !end) {
      throw new Error('All edges must reference valid nodes.');
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const c = dx / length;
    const s = dy / length;
    const stiffness = (edge.elastic_modulus * edge.area) / length;

    const dof = [
      displacements[start.index * 2],
      displacements[start.index * 2 + 1],
      displacements[end.index * 2],
      displacements[end.index * 2 + 1],
    ];

    const axialExtension = -c * dof[0] - s * dof[1] + c * dof[2] + s * dof[3];
    const axialForce = stiffness * axialExtension;
    return { id: edge.id, axialForce };
  });
}

function mapNodeResponses(nodes, displacements, reactions) {
  const displacementMap = new Map();
  const reactionMap = new Map();
  nodes.forEach((node, idx) => {
    displacementMap.set(node.id, {
      dx: displacements[idx * 2],
      dy: displacements[idx * 2 + 1],
    });
    reactionMap.set(node.id, {
      rx: reactions[idx * 2],
      ry: reactions[idx * 2 + 1],
    });
  });
  return { displacementMap, reactionMap };
}

function computeMaxDisplacement(displacements) {
  let max = 0;
  for (let i = 0; i < displacements.length; i += 2) {
    const dx = displacements[i];
    const dy = displacements[i + 1];
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > max) {
      max = magnitude;
    }
  }
  return max;
}

/**
 * Calculate nodal displacements, member axial forces, and support reactions for a 2D truss.
 *
 * @param {NodeDefinition[]} nodes
 * @param {EdgeDefinition[]} edges
 * @returns {TrussPerformance}
 */
function computeTrussPerformance(nodes, edges) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    throw new Error('Nodes and edges must be arrays.');
  }

  const nodeIndex = buildNodeIndex(nodes);
  const stiffness = assembleGlobalStiffness(nodes, edges, nodeIndex);
  const loads = buildLoadVector(nodes);

  const fixedDofs = [];
  const freeDofs = [];
  nodes.forEach((node, idx) => {
    if (node.fixed.x) {
      fixedDofs.push(idx * 2);
    } else {
      freeDofs.push(idx * 2);
    }
    if (node.fixed.y) {
      fixedDofs.push(idx * 2 + 1);
    } else {
      freeDofs.push(idx * 2 + 1);
    }
  });

  if (freeDofs.length === 0) {
    throw new Error(
      'No free degrees of freedom remain after applying supports.'
    );
  }

  const reducedMatrix = extractMatrix(stiffness, freeDofs);
  const reducedLoads = extractVector(loads, freeDofs);
  const freeDisplacements = solveLinearSystem(reducedMatrix, reducedLoads);

  const fullDisplacements = Array.from({ length: nodes.length * 2 }, () => 0);
  freeDofs.forEach((dof, idx) => {
    fullDisplacements[dof] = freeDisplacements[idx];
  });

  const reactions = stiffness.map((row, rowIdx) => {
    let sum = 0;
    row.forEach((value, colIdx) => {
      sum += value * fullDisplacements[colIdx];
    });
    return sum - loads[rowIdx];
  });

  const memberForces = computeMemberForces(edges, nodeIndex, fullDisplacements);
  const { displacementMap, reactionMap } = mapNodeResponses(
    nodes,
    fullDisplacements,
    reactions
  );

  return {
    displacements: displacementMap,
    reactions: reactionMap,
    memberForces,
    maxDisplacement: computeMaxDisplacement(fullDisplacements),
  };
}
if (typeof window !== 'undefined') {
  window.computeTrussPerformance = computeTrussPerformance;
}

if (typeof module !== 'undefined') {
  module.exports = {
    computeTrussPerformance,
  };
}
