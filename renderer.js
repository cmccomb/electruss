const editable_color = "red";
const fixed_color = "blue";
const edge_color = "green";

// create an array with nodes
let nodes = new vis.DataSet([
    {id: 1, x: 0, y: 0, fixed: true, physics: false, shape: "square", size: 15, color: fixed_color},
    {id: 2, x: 100, y: 0, fixed: true, physics: false, shape: "square", size: 15, color: fixed_color},
    {id: 3, x: 200, y: 0, fixed: true, physics: false, shape: "square", size: 15, color: fixed_color},
]);

// create an array with edges
let edges = new vis.DataSet([]);

// create a network
let container = document.getElementById('network');

let data = {
    nodes: nodes,
    edges: edges
};

let options = {
    autoResize: true,
    height: '100%',
    width: '100%',
    locale: 'en',
    manipulation: {
        enabled: false,
        addNode: function(nodeData,callback) {
            nodeData.label = undefined;
            nodeData.physics = false;
            nodeData.color = editable_color;
            evaluate();
            callback(nodeData);
            network.addNodeMode();
        },
        addEdge: function(edgeData,callback) {
            if (edgeData.to !== edgeData.from) {
                edgeData.smooth = false;
                edgeData.color = edge_color;
                edgeData.width = 5;
                evaluate();
                callback(edgeData);
            }
            network.addEdgeMode();
        }
    }
};

let network = new vis.Network(container, data, options);

$("#add-node").on('click', function (e) {
    disable_all();
    $("#add-node").addClass("active");
    network.addNodeMode();
})

$("#add-edge").on('click', function (e) {
    disable_all();
    $("#add-edge").addClass("active");
    network.addEdgeMode();
})

$("#zoom-to-fit").on('click', function (e) {
    disable_all();
    network.disableEditMode();
    network.fit({animation: true})
})

function disable_all() {
    $("#add-edge").removeClass("active");
    $("#add-node").removeClass("active");
}

function evaluate() {
    let net = network;
}

