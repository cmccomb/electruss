const editable_color = "red";
const fixed_color = "blue";
const edge_color = "green";

// create an array with nodes
let nodes = new vis.DataSet([
    {id: 1, x: -100, y: 0, fixed: true, physics: false, shape: "square", size: 15, color: fixed_color},
    {id: 2, x: 100, y: 0, fixed: true, physics: false, shape: "square", size: 15, color: fixed_color},
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
        addNode: function (nodeData, callback) {
            nodeData.label = undefined;
            nodeData.physics = false;
            nodeData.color = editable_color;
            callback(nodeData);
            network.addNodeMode();
        },
        editNode: function (nodeData, callback) {
            console.log(nodeData);
            $("#nodeModalLabel").val(nodeData.id);
            $('#node-x-fixed').prop('checked', nodeData.fixed.x);
            $('#node-y-fixed').prop('checked', nodeData.fixed.y);
            $('#node-x-coord').val(nodeData.x);
            $('#node-y-coord').val(nodeData.y);
            $('#nodeModal').modal('show');
            callback(nodeData);
        },
        addEdge: function (edgeData, callback) {
            if (edgeData.to !== edgeData.from) {
                edgeData.smooth = false;
                edgeData.color = edge_color;
                edgeData.width = 5;
                callback(edgeData);
            }
            network.addEdgeMode();
        },
        editEdge: {
            editWithoutDrag: function(edgeData, callback) {
                $('#edgeModal').modal('show');
                callback(edgeData);
            }
        },
        deleteNode: true,
        deleteEdge: true,
    }
};

let network = new vis.Network(container, data, options);

network.fit({animation: true})

$("#add-node").on('click', function (e) {
    disable_all();
    $("#add-node").addClass("active");
    network.addNodeMode();
})

$("#edit-node").on('click', function (e) {
    disable_all();
    network.editNode();
})

$("#add-edge").on('click', function (e) {
    disable_all();
    $("#add-edge").addClass("active");
    network.addEdgeMode();
})

$("#edit-edge").on('click', function (e) {
    disable_all();
    network.editEdgeMode();
})

$("#delete").on('click', function (e) {
    disable_all();
    network.deleteSelected();
})

$("#zoom-to-fit").on('click', function (e) {
    disable_all();
    network.disableEditMode();
    network.fit({animation: true})
})

$("#node-modal-apply").on('click', function (e) {
    let node = nodes.get(parseInt($("#nodeModalLabel").val()));
    node.fixed.x = $('#node-x-fixed').prop('checked');
    node.fixed.y = $('#node-y-fixed').prop('checked');
    node.x = parseInt($('#node-x-coord').val());
    node.y = parseInt($('#node-y-coord').val());
    nodes.update(node);
    $('#nodeModal').modal('hide');
})

$("#edge-modal-apply").on('click', function (e) {
    $('#edgeModal').modal('hide');
})

function disable_all() {
    $("#add-edge").removeClass("active");
    $("#add-node").removeClass("active");
}
