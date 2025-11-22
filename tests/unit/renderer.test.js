class MockDataSet {
  constructor(items = []) {
    this.items = new Map();
    items.forEach((item, idx) => {
      const id = item.id ?? idx;
      this.items.set(id, { ...item, id });
    });
  }

  getIds() {
    return Array.from(this.items.keys());
  }

  get(id) {
    return this.items.get(id);
  }

  update(item) {
    this.items.set(item.id, { ...this.items.get(item.id), ...item });
  }
}

class MockNetwork {
  constructor(container, data, options) {
    this.container = container;
    this.data = data;
    this.options = options;
    this.calls = [];
  }

  addNodeMode() {
    this.calls.push('addNodeMode');
  }

  editNode() {
    this.calls.push('editNode');
  }

  addEdgeMode() {
    this.calls.push('addEdgeMode');
  }

  editEdgeMode() {
    this.calls.push('editEdgeMode');
  }

  deleteSelected() {
    this.calls.push('deleteSelected');
  }

  disableEditMode() {
    this.calls.push('disableEditMode');
  }

  fit() {
    this.calls.push('fit');
  }

  setOptions(newOptions) {
    this.options = newOptions;
    this.calls.push('setOptions');
  }
}

let renderer;

const createRenderer = () => {
  jest.resetModules();
  document.body.innerHTML = `
    <button id="add-node" class="active"></button>
    <button id="drag-node" class="active"></button>
    <button id="add-edge"></button>
    <button id="delete"></button>
    <button id="zoom-to-fit"></button>
    <div id="network"></div>
    <div id="nodeModal"></div>
    <div id="edgeModal"></div>
    <input id="edge-area" />
    <input id="edge-elastic-modulus" />
    <input id="edgeModalLabel" />
    <input id="nodeModalLabel" />
    <input id="node-x-fixed" />
    <input id="node-y-fixed" />
    <input id="node-x-coord" />
    <input id="node-y-coord" />
    <div id="loginModal"></div>
    <div id="all" class="d-none"></div>
    <button id="login-modal-apply"></button>
  `;

  global.window = window;
  global.document = document;
  const $ = require('jquery');
  global.$ = $;
  $.fn.modal = jest.fn();

  global.vis = {
    DataSet: MockDataSet,
    Network: MockNetwork,
  };

  renderer = require('../../renderer');
  return renderer;
};

describe('renderer interactions', () => {
  let network;

  beforeEach(() => {
    renderer = createRenderer();
    network = renderer.getNetwork();
  });

  it('deactivates toolbar buttons together', () => {
    renderer.deactivate_all();

    expect(
      document.getElementById('add-node').classList.contains('active')
    ).toBe(false);
    expect(
      document.getElementById('drag-node').classList.contains('active')
    ).toBe(false);
  });

  it('scales edge widths based on area', () => {
    const edges = renderer.getEdges();
    edges.update({ id: 'a', area: 1, width: 0 });
    edges.update({ id: 'b', area: 3, width: 0 });

    renderer.update_edges();

    const first = edges.get('a');
    const second = edges.get('b');
    expect(first.width).toBeLessThan(second.width);
  });

  it('toggles edge creation mode on click', () => {
    const addEdgeButton = document.getElementById('add-edge');
    addEdgeButton.click();

    expect(addEdgeButton.classList.contains('active')).toBe(true);
    expect(network.calls).toContain('addEdgeMode');

    addEdgeButton.click();
    expect(network.calls).toContain('disableEditMode');
  });

  it('removes login overlay on confirmation', () => {
    document.getElementById('login-modal-apply').click();

    expect(global.$.fn.modal).toHaveBeenCalled();
    expect(document.getElementById('all').classList.contains('d-none')).toBe(
      false
    );
    expect(network.calls).toContain('fit');
  });
});

describe('serialization helpers', () => {
  beforeAll(() => {
    renderer = createRenderer();
  });

  it('saves nodes and edges to json', () => {
    const edges = new MockDataSet([{ id: 1, area: 2 }]);
    const nodes = new MockDataSet([{ id: 2, x: 0, y: 0 }]);

    const json = renderer.save_to_JSON(nodes, edges);
    const parsed = JSON.parse(json);

    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.edges).toHaveLength(1);
  });
});
