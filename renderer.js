/**
 * @typedef {Object} FixedState
 * @property {boolean} x
 * @property {boolean} y
 */

/**
 * @typedef {Object} NodePayload
 * @property {number} x
 * @property {number} y
 * @property {FixedState} fixed
 * @property {boolean} physics
 * @property {string} shape
 * @property {string} [image]
 * @property {number} size
 * @property {string} [color]
 * @property {number | string} [id]
 */

/**
 * @typedef {Object} EdgePayload
 * @property {number | string} id
 * @property {number | string} from
 * @property {number | string} to
 * @property {number} area
 * @property {number} elastic_modulus
 * @property {number} width
 * @property {boolean} smooth
 * @property {string} color
 */

const EDITABLE_COLOR = 'grey';
const EDGE_COLOR = 'lightgrey';

const MIN_EDGE_WIDTH = 5;
const MAX_EDGE_WIDTH = 25;

const X_FIXED_IMAGE = './assets/images/xfixed.png';
const Y_FIXED_IMAGE = './assets/images/yfixed.png';
const XY_FIXED_IMAGE = './assets/images/xyfixed.png';

const SCALE_FACTOR = 10;

const DEFAULT_ELASTIC_MODULUS = 10 ** 9;
const DEFAULT_AREA = 1.0;

const { computeTrussPerformance } = require('./performance');

const $ =
  (typeof window !== 'undefined' && (window.$ || window.jQuery)) ||
  require('jquery');
if (typeof window !== 'undefined' && !window.$) {
  window.$ = $;
}

const vis = (typeof window !== 'undefined' && window.vis) || global.vis;

if (!vis) {
  throw new Error('vis library is required for renderer initialization.');
}

/**
 * @param {unknown} candidate
 * @returns {candidate is FixedState}
 */
function isFixedState(candidate) {
  return (
    Boolean(candidate) &&
    typeof candidate === 'object' &&
    'x' in candidate &&
    'y' in candidate &&
    typeof candidate.x === 'boolean' &&
    typeof candidate.y === 'boolean'
  );
}

/**
 * @param {unknown} candidate
 * @returns {candidate is NodePayload}
 */
function isNodePayload(candidate) {
  return (
    Boolean(candidate) &&
    typeof candidate === 'object' &&
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    isFixedState(candidate.fixed) &&
    typeof candidate.physics === 'boolean' &&
    typeof candidate.shape === 'string' &&
    typeof candidate.size === 'number'
  );
}

/**
 * @param {unknown} candidate
 * @returns {candidate is EdgePayload}
 */
function isEdgePayload(candidate) {
  return (
    Boolean(candidate) &&
    typeof candidate === 'object' &&
    'id' in candidate &&
    'from' in candidate &&
    'to' in candidate &&
    Number.isFinite(candidate.area) &&
    Number.isFinite(candidate.elastic_modulus) &&
    typeof candidate.color === 'string' &&
    typeof candidate.width === 'number' &&
    typeof candidate.smooth === 'boolean'
  );
}

/**
 * @param {unknown} fixed
 * @returns {FixedState}
 */
function normalizeFixedState(fixed) {
  if (isFixedState(fixed)) {
    return fixed;
  }

  if (typeof fixed === 'boolean') {
    return { x: fixed, y: fixed };
  }

  return { x: false, y: false };
}

class RendererModule {
  constructor(visLibrary, jqueryInstance) {
    this.vis = visLibrary;
    this.$ = jqueryInstance;

    /** @type {vis.DataSet<NodePayload>} */
    this.nodes = this.createInitialNodes();
    /** @type {vis.DataSet<EdgePayload>} */
    this.edges = new this.vis.DataSet([]);

    this.container = document.getElementById('network');
    this.options = this.createOptions();
    this.network = new this.vis.Network(
      this.container,
      { nodes: this.nodes, edges: this.edges },
      this.options
    );

    this.registerEventHandlers();
  }

  createInitialNodes() {
    const initialNodes = [
      {
        x: -100,
        y: 0,
        fixed: { x: true, y: true },
        physics: false,
        shape: 'image',
        image: XY_FIXED_IMAGE,
        size: 25,
      },
      {
        x: 100,
        y: 0,
        fixed: { x: true, y: true },
        physics: false,
        shape: 'image',
        image: XY_FIXED_IMAGE,
        size: 25,
      },
    ];

    return new this.vis.DataSet(initialNodes);
  }

  createOptions() {
    return {
      autoResize: true,
      height: '100%',
      width: '100%',
      locale: 'en',
      interaction: {
        dragNodes: false,
        selectConnectedEdges: false,
      },
      manipulation: {
        enabled: false,
        addNode: (nodeData, callback) => {
          const normalizedNode = {
            ...nodeData,
            label: undefined,
            physics: false,
            color: EDITABLE_COLOR,
            fixed: normalizeFixedState(nodeData.fixed),
            x: Number(nodeData.x ?? 0),
            y: Number(nodeData.y ?? 0),
            shape: 'ellipse',
            size: 25,
          };

          if (!isNodePayload(normalizedNode)) {
            throw new Error('Invalid node data received.');
          }

          callback(normalizedNode);
          this.network.addNodeMode();
        },
        editNode: (nodeData, callback) => {
          const targetNode = this.nodes.get(nodeData.id);
          if (!targetNode || !isNodePayload(targetNode)) {
            throw new Error('Unable to edit node with invalid data.');
          }
          const normalizedFixed = normalizeFixedState(targetNode.fixed);

          this.$('#nodeModalLabel').val(nodeData.id);
          this.$('#node-x-fixed').prop('checked', normalizedFixed.x);
          this.$('#node-y-fixed').prop('checked', normalizedFixed.y);
          this.$('#node-x-coord').val(targetNode.x);
          this.$('#node-y-coord').val(targetNode.y);
          this.$('#nodeModal').modal('show');
          callback(nodeData);
        },
        addEdge: (edgeData, callback) => {
          if (edgeData.to !== edgeData.from) {
            const normalizedEdge = {
              ...edgeData,
              smooth: false,
              color: EDGE_COLOR,
              width: MIN_EDGE_WIDTH,
              area: DEFAULT_AREA,
              elastic_modulus: DEFAULT_ELASTIC_MODULUS,
            };

            const edgeId =
              normalizedEdge.id ??
              `${normalizedEdge.from}-${normalizedEdge.to}`;
            const completeEdge = { ...normalizedEdge, id: edgeId };

            if (!isEdgePayload(completeEdge)) {
              throw new Error('Invalid edge data received.');
            }

            callback(completeEdge);
          }
          this.updateEdges();
          this.network.addEdgeMode();
        },
        editEdge: {
          editWithoutDrag: (edgeData, callback) => {
            const existingEdge = this.edges.get(edgeData.id);
            if (!existingEdge || !isEdgePayload(existingEdge)) {
              throw new Error('Unable to edit edge with invalid data.');
            }
            this.$('#edgeModalLabel').val(existingEdge.id);
            this.$('#edgeModal').modal('show');
            this.$('#edge-area').val(existingEdge.area);
            this.$('#edge-elastic-modulus').val(existingEdge.elastic_modulus);
            callback(existingEdge);
          },
        },
        deleteNode: true,
        deleteEdge: true,
      },
    };
  }

  registerEventHandlers() {
    this.$('#add-node').on('click', () => {
      this.deactivate('#add-edge');
      this.deactivate('#drag-node');
      this.$('#add-node').toggleClass('active');
      if (this.$('#add-node').hasClass('active') === true) {
        this.network.addNodeMode();
      } else {
        this.network.disableEditMode();
      }
    });

    this.$('#edit-node').on('click', () => {
      this.deactivateAll();
      this.network.editNode();
    });

    this.$('#drag-node').on('click', () => {
      this.deactivate('#add-edge');
      this.deactivate('#add-node');
      this.$('#drag-node').toggleClass('active');
      if (this.$('#drag-node').hasClass('active') === true) {
        const updatedOptions = {
          ...this.options,
          interaction: { ...this.options.interaction, dragNodes: true },
        };
        this.options = updatedOptions;
        this.network.setOptions(this.options);
      } else {
        const updatedOptions = {
          ...this.options,
          interaction: { ...this.options.interaction, dragNodes: false },
        };
        this.options = updatedOptions;
        this.network.setOptions(this.options);
      }
    });

    this.$('#add-edge').on('click', () => {
      this.deactivate('#add-node');
      this.deactivate('#drag-node');
      this.$('#add-edge').toggleClass('active');
      if (this.$('#add-edge').hasClass('active') === true) {
        this.network.addEdgeMode();
      } else {
        this.network.disableEditMode();
      }
    });

    this.$('#edit-edge').on('click', () => {
      this.deactivateAll();
      this.network.editEdgeMode();
      this.updateEdges();
    });

    this.$('#delete').on('click', () => {
      this.deactivateAll();
      this.network.deleteSelected();
      this.updateEdges();
    });

    this.$('#zoom-to-fit').on('click', () => {
      this.deactivateAll();
      this.network.disableEditMode();
      this.network.fit({ animation: true });
    });

    this.$('#analyze-truss').on('click', () => {
      this.analyzeStructure();
    });

    this.$('#node-modal-apply').on('click', () => {
      const nodeId = this.$('#nodeModalLabel').val();
      const node = this.nodes.get(nodeId);
      const fixedState = {
        x: this.$('#node-x-fixed').prop('checked'),
        y: this.$('#node-y-fixed').prop('checked'),
      };
      const updatedNode = {
        ...node,
        fixed: fixedState,
        x: parseFloat(this.$('#node-x-coord').val()),
        y: parseFloat(this.$('#node-y-coord').val()),
      };

      if (!isNodePayload(updatedNode)) {
        throw new Error('Invalid node data submitted.');
      }

      if (updatedNode.fixed.x === true && updatedNode.fixed.y === false) {
        updatedNode.shape = 'image';
        updatedNode.image = X_FIXED_IMAGE;
        updatedNode.size = 12.5;
      } else if (
        updatedNode.fixed.x === false &&
        updatedNode.fixed.y === true
      ) {
        updatedNode.shape = 'image';
        updatedNode.image = Y_FIXED_IMAGE;
        updatedNode.size = 12.5;
      } else if (updatedNode.fixed.x === true && updatedNode.fixed.y === true) {
        updatedNode.shape = 'image';
        updatedNode.image = XY_FIXED_IMAGE;
        updatedNode.size = 25;
      } else if (
        updatedNode.fixed.x === false &&
        updatedNode.fixed.y === false
      ) {
        updatedNode.shape = 'ellipse';
        updatedNode.size = 25;
        updatedNode.color = EDITABLE_COLOR;
      }
      this.nodes.update(updatedNode);
      this.$('#nodeModal').modal('hide');
    });

    this.$('#edge-modal-apply').on('click', () => {
      const edge = this.edges.get(this.$('#edgeModalLabel').val());
      const updatedEdge = {
        ...edge,
        area: parseFloat(this.$('#edge-area').val()),
        elastic_modulus: parseFloat(this.$('#edge-elastic-modulus').val()),
      };

      if (!isEdgePayload(updatedEdge)) {
        throw new Error('Invalid edge data submitted.');
      }

      this.edges.update(updatedEdge);
      this.$('#edgeModal').modal('hide');
      this.updateEdges();
    });

    this.$('#login-modal-apply').on('click', () => {
      this.$('#loginModal').modal('hide');
      this.$('#all').removeClass('d-none');
      this.network.fit();
    });
  }

  buildTrussDefinition() {
    const nodes = this.nodes
      .getIds()
      .map((nodeId) => this.nodes.get(nodeId))
      .filter((node) => isNodePayload(node))
      .map((node) => ({
        id: node.id,
        x: Number(node.x),
        y: Number(node.y),
        fixed: normalizeFixedState(node.fixed),
        load: node.load ?? { fx: 0, fy: 0 },
      }));

    const edges = this.edges
      .getIds()
      .map((edgeId) => this.edges.get(edgeId))
      .filter((edge) => isEdgePayload(edge))
      .map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        area: edge.area,
        elastic_modulus: edge.elastic_modulus,
      }));

    if (nodes.length === 0) {
      throw new Error('Add at least one node before running analysis.');
    }

    if (edges.length === 0) {
      throw new Error('Connect nodes with at least one edge to analyze.');
    }

    return { nodes, edges };
  }

  renderPerformance(performance) {
    const maxDisplacement = Number(performance.maxDisplacement ?? 0);
    this.$('#analysis-max-displacement').text(
      `${maxDisplacement.toExponential(3)} units`
    );

    const memberList = this.$('#analysis-member-forces');
    memberList.empty();
    if (performance.memberForces.length === 0) {
      memberList.append(
        this.$('<li></li>')
          .addClass('list-group-item')
          .text('No members in model to evaluate.')
      );
    } else {
      performance.memberForces.forEach((member) => {
        const item = this.$('<li></li>').addClass(
          'list-group-item d-flex justify-content-between align-items-center'
        );
        item.append(this.$('<span></span>').text(member.id));
        item.append(
          this.$('<span></span>').text(
            `${member.axialForce.toExponential(3)} N`
          )
        );
        memberList.append(item);
      });
    }

    this.$('#analysis-results').removeClass('d-none');
  }

  renderAnalysisError(message) {
    this.$('#analysis-error').text(message).removeClass('d-none');
  }

  clearAnalysisMessages() {
    this.$('#analysis-error').addClass('d-none').text('');
    this.$('#analysis-results').addClass('d-none');
  }

  analyzeStructure() {
    this.clearAnalysisMessages();
    try {
      const { nodes, edges } = this.buildTrussDefinition();
      const performance = computeTrussPerformance(nodes, edges);
      this.renderPerformance(performance);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.renderAnalysisError(message);
    }
  }

  updateEdges() {
    const ids = this.edges.getIds();
    if (ids.length === 0) {
      return;
    }

    const edgePayloads = ids
      .map((edgeId) => this.edges.get(edgeId))
      .filter((edge) => isEdgePayload(edge));

    if (edgePayloads.length === 0) {
      return;
    }

    const areas = edgePayloads.map((edge) => edge.area);
    const minarea = Math.min(...areas);
    const darea = Math.max(...areas) - minarea;

    edgePayloads.forEach((edge, index) => {
      if (darea !== 0) {
        const scaledWidth = (areas[index] - minarea) / darea;
        const width =
          scaledWidth * (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH) + MIN_EDGE_WIDTH;
        this.edges.update({ ...edge, width });
      }
    });
  }

  deactivate(name) {
    this.$(name).removeClass('active');
  }

  deactivateAll() {
    this.deactivate('#add-node');
    this.deactivate('#add-edge');
    this.deactivate('#drag-node');
  }

  static saveToJSON(nodes, edges) {
    const network = { time: new Date(), nodes: [], edges: [] };
    const nodeIds = nodes.getIds();
    for (let i = 0; i < nodeIds.length; i += 1) {
      network.nodes.push(nodes.get(nodeIds[i]));
    }

    const edgeIds = edges.getIds();
    for (let i = 0; i < edgeIds.length; i += 1) {
      network.edges.push(edges.get(edgeIds[i]));
    }

    return JSON.stringify(network);
  }
}

function canv2sim(node) {
  return [node.x[0] / SCALE_FACTOR, -node.y[1] / SCALE_FACTOR];
}

function sim2canv(node) {
  return [node.x[0] * SCALE_FACTOR, -node.y[1] * SCALE_FACTOR];
}

const rendererModule = new RendererModule(vis, $);

const rendererApi = {
  update_edges: () => rendererModule.updateEdges(),
  deactivate: (selector) => rendererModule.deactivate(selector),
  deactivate_all: () => rendererModule.deactivateAll(),
  save_to_JSON: (nodes, edges) => RendererModule.saveToJSON(nodes, edges),
  canv2sim,
  sim2canv,
  getNetwork: () => rendererModule.network,
  getNodes: () => rendererModule.nodes,
  getEdges: () => rendererModule.edges,
  analyze_truss: () => rendererModule.analyzeStructure(),
};

if (typeof window !== 'undefined') {
  window.electruss = rendererApi;
}

if (typeof module !== 'undefined') {
  module.exports = rendererApi;
}
