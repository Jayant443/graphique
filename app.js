const graph = new Graph('graph-container');
const buttons = {
    select: document.getElementById('btn-select'),
    addNode: document.getElementById('btn-add-node'),
    addEdge: document.getElementById('btn-add-edge'),
    delete: document.getElementById('btn-delete'),
    clear: document.getElementById('btn-clear'),
    nodeSize: document.getElementById('slider-node-size'),
    edgeLength: document.getElementById('slider-edge-length'),
    directed: document.getElementById('check-directed'),
    nodeNameInput: document.getElementById('input-node-name')
};
function setActiveButton(activeId) {
    Object.entries(buttons).forEach(([id, btn]) => {
        if (btn && btn.tagName === 'BUTTON') {
            btn.classList.toggle('active', id === activeId);
        }
    });
}
buttons.select.addEventListener('click', () => {
    graph.setMode('select');
    setActiveButton('select');
});
buttons.addNode.addEventListener('click', () => {
    graph.setMode('addNode');
    setActiveButton('addNode');
});
buttons.addEdge.addEventListener('click', () => {
    graph.setMode('addEdge');
    setActiveButton('addEdge');
});
buttons.delete.addEventListener('click', () => {
    graph.deleteSelected();
});
buttons.clear.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the entire graph?')) {
        graph.clear();
    }
});
buttons.nodeSize.addEventListener('input', (e) => {
    graph.setVisualScale('node-radius', e.target.value);
});
buttons.edgeLength.addEventListener('input', (e) => {
    graph.setPhysicsProperty('edgeLength', e.target.value);
});
buttons.directed.addEventListener('change', (e) => {
    graph.directedEdges = e.target.checked;
});
buttons.nodeNameInput.addEventListener('input', (e) => {
    const val = e.target.value;
    graph.nextNodeName = val;
    if (graph.selectedElement && graph.selectedElement.type === 'node') {
        graph.updateNodeLabel(graph.selectedElement.data.id, val);
    }
});
graph.onSelectionChange = (selection) => {
    if (selection && selection.type === 'node') {
        buttons.nodeNameInput.value = selection.data.label;
    } else {
        buttons.nodeNameInput.value = graph.nextNodeName;
    }
};
window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return;
    if (e.key === 's' || e.key === 'S') buttons.select.click();
    if (e.key === 'n' || e.key === 'N') buttons.addNode.click();
    if (e.key === 'e' || e.key === 'E') buttons.addEdge.click();
    if (e.key === 'Delete' || e.key === 'Backspace') graph.deleteSelected();
});
const demoNodes = [
    { id: '1', label: 'Main' },
    { id: '2', label: 'Sub A' },
    { id: '3', label: 'Sub B' },
    { id: '4', label: 'Feature' },
    { id: '5', label: 'Extra' }
];
demoNodes.forEach(n => graph.addNode(n.id, n.label));
graph.addEdge('1', '2', true);
graph.addEdge('1', '3', true);
graph.addEdge('2', '4', true);
graph.addEdge('3', '4', true);
graph.addEdge('4', '5', false);
graph.addEdge('5', '1', true);
