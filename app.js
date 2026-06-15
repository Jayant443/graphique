const graph = new Graph('graph-container');
const buttons = {
    select: document.getElementById('btn-select'),
    addNode: document.getElementById('btn-add-node'),
    addEdge: document.getElementById('btn-add-edge'),
    delete: document.getElementById('btn-delete'),
    clear: document.getElementById('btn-clear'),
    undo: document.getElementById('btn-undo'),
    redo: document.getElementById('btn-redo'),
    export: document.getElementById('btn-export'),
    import: document.getElementById('btn-import'),
    importInput: document.getElementById('input-import'),
    download: document.getElementById('btn-download'),
    nodeSize: document.getElementById('slider-node-size'),
    nodeSizeVal: document.getElementById('val-node-size'),
    edgeLength: document.getElementById('slider-edge-length'),
    edgeLengthVal: document.getElementById('val-edge-length'),
    directed: document.getElementById('check-directed'),
    nodeNameInput: document.getElementById('input-node-name'),
    graphType: document.getElementById('select-graph-type'),
    more: document.getElementById('btn-more'),
    moreMenu: document.getElementById('more-options-menu'),
    algoSelect: document.getElementById('select-algo'),
    runAlgo: document.getElementById('btn-run-algo'),
    stopAlgo: document.getElementById('btn-stop-algo'),
    pauseAlgo: document.getElementById('btn-pause-algo'),
    vizPanel: document.getElementById('viz-panel'),
    vizQueue: document.getElementById('viz-queue'),
    vizOrder: document.getElementById('viz-order'),
    vizAlgoName: document.getElementById('viz-algo-name'),
    vizStructureLabel: document.getElementById('viz-structure-label'),
    vizDistancesSection: document.getElementById('viz-distances-section'),
    vizDistances: document.getElementById('viz-distances'),
    coords: document.getElementById('viz-coords'),
    customAlgoInputs: document.getElementById('custom-algo-inputs'),
    customSequenceContainer: document.getElementById('custom-sequence-container'),
    btnClearSequence: document.getElementById('btn-clear-sequence'),
    btnToggleViz: document.getElementById('btn-toggle-viz'),
    app: document.getElementById('app'),
    vizAnalysisResults: document.getElementById('viz-analysis-results'),
    analysisEulerPath: document.getElementById('analysis-euler-path'),
    analysisEulerCircuit: document.getElementById('analysis-euler-circuit'),
    analysisHamiltonianPath: document.getElementById('analysis-hamiltonian-path'),
    analysisHamiltonianCircuit: document.getElementById('analysis-hamiltonian-circuit')
};

let customSequence = [];

function updateSequenceUI() {
    if (!buttons.customSequenceContainer) return;

    if (customSequence.length === 0) {
        buttons.customSequenceContainer.innerHTML = '<div class="empty-chips-hint">Click nodes on graph to add to sequence</div>';
        buttons.runAlgo.disabled = true;
        return;
    }

    buttons.runAlgo.disabled = false;
    buttons.customSequenceContainer.innerHTML = customSequence.map((nodeId, index) => {
        const node = graph.nodes.get(nodeId);
        const label = node ? node.label : nodeId;
        return `
            <div class="node-chip" data-index="${index}">
                <span>${label}</span>
                <span class="remove-chip" onclick="removeNodeFromSequence(${index}, event)">×</span>
            </div>
        `;
    }).join('');
}

window.removeNodeFromSequence = (index, event) => {
    if (event) event.stopPropagation();
    customSequence.splice(index, 1);
    updateSequenceUI();
};

buttons.btnClearSequence.addEventListener('click', () => {
    customSequence = [];
    graph.clearHighlights();
    updateSequenceUI();
    buttons.vizQueue.innerHTML = '<div class="empty-state">Empty</div>';
    buttons.vizOrder.innerHTML = '<div class="empty-state">No nodes visited</div>';
    buttons.vizAnalysisResults.style.display = 'none';
});

buttons.btnToggleViz.addEventListener('click', () => {
    buttons.app.classList.toggle('viz-hidden');
});

function setActiveButton(activeId) {
    Object.entries(buttons).forEach(([id, btn]) => {
        if (btn && btn.tagName === 'BUTTON') {
            btn.classList.toggle('active', id === activeId);
        }
    });

    document.body.classList.remove('mode-select', 'mode-addNode', 'mode-addEdge');
    document.body.classList.add(`mode-${activeId}`);
}

buttons.select.addEventListener('click', () => {
    graph.setMode('select');
    setActiveButton('select');
});
buttons.addNode.addEventListener('click', () => {
    graph.setMode('addNode');
    setActiveButton('addNode');
    buttons.nodeNameInput.value = '';
    graph.nextNodeName = '';
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
buttons.undo.addEventListener('click', () => graph.undo());
buttons.redo.addEventListener('click', () => graph.redo());

if (buttons.more && buttons.moreMenu) {
    buttons.more.onclick = (e) => {
        e.stopPropagation();
        buttons.moreMenu.classList.toggle('show');
    };

    window.onclick = (e) => {
        if (!e.target.closest('.dropdown-container')) {
            buttons.moreMenu.classList.remove('show');
        }
    };

    buttons.moreMenu.onclick = (e) => {
        if (e.target.closest('button')) {
            buttons.moreMenu.classList.remove('show');
        }
    };
}

buttons.export.addEventListener('click', () => {
    const data = JSON.stringify(graph.serialize(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

buttons.import.addEventListener('click', () => buttons.importInput.click());
buttons.importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            graph.deserialize(data);
            if (data.settings) {
                if (data.settings.physics) {
                    buttons.edgeLength.value = data.settings.physics.edgeLength;
                    buttons.edgeLengthVal.textContent = data.settings.physics.edgeLength;
                }
                buttons.directed.checked = data.settings.directedEdges;
                buttons.nodeNameInput.value = data.settings.nextNodeName || "";
                buttons.graphType.value = data.settings.isWeighted ? 'weighted' : 'unweighted';
            }
        } catch (err) {
            alert('Error importing graph: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

buttons.download.addEventListener('click', () => {
    const svg = document.getElementById('graph-container');
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const infoWidth = 300;
    const padding = 20;

    const svgClone = svg.cloneNode(true);
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --node-fill: #ffffff;
            --node-stroke: #6c6dd5;
            --edge-stroke: #c8cede;
            --primary-color: #5b5bd6;
            --primary-hover: #4848bd;
            --text-color: #1c2440;
            --edge-width: 2px;
            --node-radius: 25px;
        }
        .node { fill: var(--node-fill); stroke: var(--node-stroke); stroke-width: 2px; }
        .node-label { font-size: 15px; font-weight: 600; text-anchor: middle; fill: var(--text-color); font-family: sans-serif; }
        .edge { stroke: var(--edge-stroke); stroke-width: var(--edge-width); fill: none; }
        .edge.directed { marker-end: url(#arrowhead); }
        .edge.selected { stroke: #5b5bd6; stroke-width: 4px; }
        .edge-label-bg { fill: white; fill-opacity: 0.94; stroke: #e5e9f2; }
        .edge-label { font-size: 11px; font-weight: 700; text-anchor: middle; fill: #525b73; font-family: sans-serif; }
        .edge.traversed { stroke: var(--primary-color); stroke-width: 3px; }
        .node.visited { fill: #e2faf5; stroke: #10b9a6; }
        .node.processing { fill: var(--primary-color); stroke: var(--primary-hover); }
    `;
    svgClone.prepend(style);
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);
    svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = (width + infoWidth) * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width + infoWidth, height);
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = '#f9fafd';
        ctx.fillRect(width, 0, infoWidth, height);
        ctx.strokeStyle = '#e5e9f2';
        ctx.beginPath();
        ctx.moveTo(width, 0);
        ctx.lineTo(width, height);
        ctx.stroke();
        ctx.fillStyle = '#1c2440';
        ctx.font = 'bold 16px sans-serif';
        let y = 40;

        ctx.fillText('Graph Details', width + padding, y);
        y += 30;

        const data = graph.getGraphData();

        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('Adjacency List', width + padding, y);
        y += 20;
        ctx.font = '11px monospace';
        ctx.fillStyle = '#525b73';

        data.adjList.forEach((neighbors, nodeId) => {
            const node = data.nodes.find(n => n.id === nodeId);
            const neighborLabels = neighbors.map(nb => {
                const target = data.nodes.find(n => n.id === nb.id);
                return graph.isWeighted ? `${target.label}(${nb.weight})` : target.label;
            });
            const text = `${node.label}: ${neighborLabels.join(', ') || '-'}`;
            const words = text.split(' ');
            let line = '';
            for (let n = 0; words.length > 0 && n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = ctx.measureText(testLine);
                if (metrics.width > infoWidth - (padding * 2) && n > 0) {
                    ctx.fillText(line, width + padding, y);
                    line = words[n] + ' ';
                    y += 15;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, width + padding, y);
            y += 15;
        });

        y += 20;
        ctx.fillStyle = '#1c2440';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('Adjacency Matrix', width + padding, y);
        y += 20;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#525b73';

        if (data.nodes.length > 0 && data.nodes.length <= 15) {
            let header = '  ' + data.nodes.map(n => n.label[0]).join(' ');
            ctx.fillText(header, width + padding, y);
            y += 15;
            data.nodes.forEach(rowNode => {
                let row = rowNode.label[0] + ' ';
                data.nodes.forEach(colNode => {
                    const conn = data.adjList.get(rowNode.id).find(n => n.id === colNode.id);
                    row += (conn ? (graph.isWeighted ? conn.weight : '1') : '0') + ' ';
                });
                ctx.fillText(row, width + padding, y);
                y += 12;
            });
        } else if (data.nodes.length > 15) {
            ctx.fillText('(Matrix too large for preview)', width + padding, y);
            y += 15;
        }

        y += 20;

        if (!buttons.app.classList.contains('viz-hidden')) {
            ctx.fillStyle = '#5b5bd6';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(buttons.vizAlgoName.textContent, width + padding, y);
            y += 20;

            ctx.fillStyle = '#525b73';
            ctx.font = '11px sans-serif';
            const orderNodes = Array.from(buttons.vizOrder.querySelectorAll('.viz-node')).map(el => el.textContent);
            if (orderNodes.length > 0) {
                ctx.fillText('Order:', width + padding, y);
                y += 15;
                let pathText = orderNodes.join(' → ');
                const words = pathText.split(' ');
                let line = '';
                for (let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    if (ctx.measureText(testLine).width > infoWidth - (padding * 2)) {
                        ctx.fillText(line, width + padding, y);
                        line = words[n] + ' ';
                        y += 15;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, width + padding, y);
            }
        }

        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `graph-data-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    };
    img.src = url;
});

buttons.nodeSize.addEventListener('input', (e) => {
    graph.setVisualScale('node-radius', e.target.value);
    buttons.nodeSizeVal.textContent = e.target.value;
});
buttons.edgeLength.addEventListener('input', (e) => {
    graph.setPhysicsProperty('edgeLength', e.target.value);
    buttons.edgeLengthVal.textContent = e.target.value;
});

const panelElements = {
    adjList: document.getElementById('adj-list-container'),
    adjMatrix: document.getElementById('adj-matrix-table')
};

graph.onGraphUpdate = (data) => {
    const { nodes, adjList, treeInfo } = data;
    const isTree = treeInfo.isTree;
    const header = document.querySelector('.panel-section-header');
    let badge = header.querySelector('.status-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'status-badge';
        header.appendChild(badge);
    }
    badge.textContent = isTree ? 'tree' : 'General Graph';
    badge.className = `status-badge ${isTree ? 'badge-tree' : 'badge-graph'}`;

    let listHtml = '';
    adjList.forEach((neighbors, nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        const neighborLabels = neighbors.map(neighbor => {
            const target = nodes.find(n => n.id === neighbor.id);
            return graph.isWeighted ? `${target.label}(${neighbor.weight})` : target.label;
        });
        listHtml += `
            <div class="adj-list-item" data-source-id="${node.id}">
                <div class="adj-list-header">
                    <span class="adj-list-node">${node.label}<span class="live-coords" data-node-id="${node.id}">(${Math.round(node.x)}, ${Math.round(node.y)})</span>:</span>
                    <span class="adj-list-neighbors" contenteditable="true" spellcheck="false">${neighborLabels.join(', ') || ' '}</span>
                </div>
            </div>`;
    });
    panelElements.adjList.innerHTML = listHtml || 'No nodes';

    graph.onAnimationStep = (nodes) => {
        nodes.forEach(node => {
            const el = panelElements.adjList.querySelector(`.live-coords[data-node-id="${node.id}"]`);
            if (el) {
                el.textContent = `(${Math.round(node.x)}, ${Math.round(node.y)})`;
            }
        });
    };

    if (nodes.length > 0) {
        let matrixHtml = '<tr><th></th>' + nodes.map(n => `<th>${n.label[0]}</th>`).join('') + '</tr>';
        nodes.forEach(rowNode => {
            matrixHtml += `<tr><th>${rowNode.label[0]}</th>`;
            nodes.forEach(colNode => {
                const connection = adjList.get(rowNode.id).find(n => n.id === colNode.id);
                const cellValue = connection ? (graph.isWeighted ? connection.weight : '1') : '0';
                matrixHtml += `<td contenteditable="true" data-source-id="${rowNode.id}" data-target-id="${colNode.id}">${cellValue}</td>`;
            });
            matrixHtml += '</tr>';
        });
        panelElements.adjMatrix.innerHTML = matrixHtml;
    } else {
        panelElements.adjMatrix.innerHTML = '';
    }

    graph.edges.forEach(edge => {
        if (edge.labelGroup) {
            edge.labelGroup.style.display = graph.isWeighted ? 'block' : 'none';
        }
    });
};

panelElements.adjList.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('adj-list-neighbors')) {
        graph.notifyUpdate();
    }
});

panelElements.adjMatrix.addEventListener('focusout', (e) => {
    if (e.target.tagName === 'TD') {
        const sourceId = e.target.dataset.sourceId;
        const targetId = e.target.dataset.targetId;
        const val = e.target.textContent.trim();
        const weight = parseFloat(val);

        if (val === '0' || isNaN(weight)) {
            graph.removeEdge(sourceId, targetId);
        } else {
            let edge = graph.edges.find(e =>
                (e.source.id === sourceId && e.target.id === targetId) ||
                (!graph.directedEdges && e.source.id === targetId && e.target.id === sourceId)
            );
            if (!edge) {
                edge = graph.addEdge(sourceId, targetId, graph.directedEdges);
            }
            if (edge && graph.isWeighted) {
                graph.updateEdgeLabel(edge, val);
            }
        }
        graph.notifyUpdate();
        graph.wake();
    }
});

panelElements.adjMatrix.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
    }
});

panelElements.adjList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.target.classList.contains('adj-list-neighbors')) {
            const item = e.target.closest('.adj-list-item');
            const sourceId = item.dataset.sourceId;
            const text = e.target.textContent.trim();
            const labels = text.split(',').map(l => l.trim()).filter(l => l.length > 0);

            graph.batchUpdate(() => {
                const isDirected = graph.directedEdges;
                graph.edges = graph.edges.filter(edge => {
                    const isMatch = edge.source.id === sourceId || (!isDirected && edge.target.id === sourceId);
                    if (isMatch) {
                        edge.group.remove();
                        return false;
                    }
                    return true;
                });

                const nodesArr = Array.from(graph.nodes.values());
                labels.forEach(label => {
                    const match = label.match(/^([^(]+)(?:\(([^)]+)\))?$/);
                    if (match) {
                        const nodeLabel = match[1].trim();
                        const weightStr = match[2];
                        const targetNode = nodesArr.find(n => n.label === nodeLabel);
                        if (targetNode) {
                            const edge = graph.addEdge(sourceId, targetNode.id, graph.directedEdges);
                            if (edge && weightStr !== undefined) {
                                graph.updateEdgeLabel(edge, weightStr);
                            }
                        }
                    }
                });
            });
            e.target.blur();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        e.target.blur();
    }
});

graph.notifyUpdate();

buttons.directed.addEventListener('change', (e) => {
    graph.directedEdges = e.target.checked;
    if (graph.selectedElement && graph.selectedElement.type === 'edge') {
        graph.updateEdgeDirectedness(graph.selectedElement.data, e.target.checked);
    }
});
buttons.nodeNameInput.addEventListener('input', (e) => {
    graph.nextNodeName = e.target.value;
});
buttons.nodeNameInput.addEventListener('change', (e) => {
    if (graph.selectedElement && graph.selectedElement.type === 'node') {
        graph.updateNodeLabel(graph.selectedElement.data.id, e.target.value);
    }
});
buttons.graphType.addEventListener('change', (e) => {
    graph.setWeighted(e.target.value === 'weighted');
});

let isAlgoRunning = false;

buttons.algoSelect.addEventListener('change', () => {
    const val = buttons.algoSelect.value;

    isAlgoRunning = false;
    graph.stopAlgorithm();
    buttons.runAlgo.style.display = 'block';
    buttons.stopAlgo.style.display = 'none';
    buttons.pauseAlgo.style.display = 'none';
    buttons.customAlgoInputs.style.display = val === 'custom' ? 'block' : 'none';

    if (val === 'custom') {
        buttons.runAlgo.disabled = customSequence.length === 0;
        buttons.vizAlgoName.textContent = 'Custom Traversal State';
        buttons.vizStructureLabel.textContent = 'Current Sequence';
        buttons.vizDistancesSection.style.display = 'none';
        updateSequenceUI();
    } else {
        buttons.runAlgo.disabled = (val === 'none' || !graph.selectedElement || graph.selectedElement.type !== 'node');
        if (val === 'none') {
            graph.clearHighlights();
        } else {
            if (val === 'bfs') {
                buttons.vizAlgoName.textContent = 'BFS State';
                buttons.vizStructureLabel.textContent = 'Queue';
                buttons.vizDistancesSection.style.display = 'none';
            } else if (val === 'dfs') {
                buttons.vizAlgoName.textContent = 'DFS State';
                buttons.vizStructureLabel.textContent = 'Recursion Stack';
                buttons.vizDistancesSection.style.display = 'none';
            } else if (val === 'dijkstra') {
                buttons.vizAlgoName.textContent = 'Dijkstra State';
                buttons.vizStructureLabel.textContent = 'Queue';
                buttons.vizDistancesSection.style.display = 'block';
            }
        }
    }
});

buttons.runAlgo.addEventListener('click', async () => {
    if (isAlgoRunning) return;

    const algo = buttons.algoSelect.value;

    if (algo !== 'custom' && (!graph.selectedElement || graph.selectedElement.type !== 'node')) return;
    if (algo === 'custom' && customSequence.length === 0) return;

    isAlgoRunning = true;
    buttons.runAlgo.style.display = 'none';
    buttons.stopAlgo.style.display = 'block';
    buttons.pauseAlgo.style.display = 'block';
    buttons.pauseAlgo.textContent = 'Pause';

    const startNode = algo !== 'custom' ? graph.selectedElement.data : null;

    const updateViz = (state) => {
        const startLabel = startNode ? startNode.label : (customSequence.length > 0 ? graph.nodes.get(customSequence[0]).label : '');
        
        if (algo === 'dijkstra') {
            buttons.vizQueue.innerHTML = state.pq && state.pq.length > 0
                ? state.pq.map(label => `<span class="viz-node ${label === startLabel ? 'source' : ''}">${label}</span>`).join('')
                : `<div class="empty-state">Queue is empty</div>`;

            buttons.vizDistances.innerHTML = state.distances
                ? Object.entries(state.distances).map(([label, dist]) => `
                    <div class="viz-distance-item ${label === startLabel ? 'source' : ''}">
                        <span class="viz-node ${label === startLabel ? 'source' : ''}">${label}</span>
                        <span class="viz-dist-val">${dist}</span>
                    </div>`).join('')
                : '<div class="empty-state">No distances calculated</div>';
        } else if (algo === 'custom') {
            buttons.vizQueue.innerHTML = state.order && state.order.length > 0
                ? state.order.map(label => `<span class="viz-node ${label === startLabel ? 'source' : ''}">${label}</span>`).join('')
                : `<div class="empty-state">Sequence is empty</div>`;
            
            if (state.analysis) {
                const a = state.analysis;
                buttons.vizAnalysisResults.style.display = 'block';
                
                const updateItem = (el, val) => {
                    el.textContent = val ? 'Yes' : 'No';
                    el.className = `analysis-value ${val ? 'yes' : 'no'}`;
                };

                updateItem(buttons.analysisEulerPath, a.isEulerPath);
                updateItem(buttons.analysisEulerCircuit, a.isEulerCircuit);
                updateItem(buttons.analysisHamiltonianPath, a.isHamiltonianPath);
                updateItem(buttons.analysisHamiltonianCircuit, a.isHamiltonianCircuit);
            } else {
                buttons.vizAnalysisResults.style.display = 'none';
            }
        } else {
            buttons.vizQueue.innerHTML = state.queue && state.queue.length > 0
                ? state.queue.map(label => `<span class="viz-node ${label === startLabel ? 'source' : ''}">${label}</span>`).join('')
                : (state.stack && state.stack.length > 0
                    ? state.stack.map(label => `<span class="viz-node ${label === startLabel ? 'source' : ''}">${label}</span>`).join('')
                    : `<div class="empty-state">${algo === 'bfs' ? 'Queue' : 'Stack'} is empty</div>`);
        }

        buttons.vizOrder.innerHTML = state.order.length > 0
            ? state.order.map((label, i) => `<span class="viz-node ${label === state.currentNode ? 'current' : ''} ${label === startLabel ? 'source' : ''}">${label}</span>`).join('')
            : '<div class="empty-state">No nodes visited</div>';
    };

    if (algo === 'bfs') {
        await graph.algorithms.runBFS(startNode.id, updateViz);
    } else if (algo === 'dfs') {
        await graph.algorithms.runDFS(startNode.id, updateViz);
    } else if (algo === 'dijkstra') {
        await graph.algorithms.runDijkstra(startNode.id, updateViz);
    } else if (algo === 'custom') {
        await graph.algorithms.runCustomTraversal(customSequence, updateViz);
    }

    if (isAlgoRunning) {
        isAlgoRunning = false;
        buttons.runAlgo.style.display = 'block';
        buttons.stopAlgo.style.display = 'none';
        buttons.pauseAlgo.style.display = 'none';
    }
});

buttons.stopAlgo.addEventListener('click', () => {
    isAlgoRunning = false;
    graph.stopAlgorithm();
    buttons.runAlgo.style.display = 'block';
    buttons.stopAlgo.style.display = 'none';
    buttons.pauseAlgo.style.display = 'none';

    buttons.vizQueue.innerHTML = '<div class="empty-state">Empty</div>';
    buttons.vizOrder.innerHTML = '<div class="empty-state">No nodes visited</div>';
});

buttons.pauseAlgo.addEventListener('click', () => {
    if (graph.algoController) {
        graph.algoController.paused = !graph.algoController.paused;
        buttons.pauseAlgo.textContent = graph.algoController.paused ? 'Resume' : 'Pause';
    }
});

graph.onSelectionChange = (selection) => {
    document.body.classList.remove('selection-node', 'selection-edge');

    if (selection && selection.type === 'node') {
        document.body.classList.add('selection-node');
        buttons.nodeNameInput.value = selection.data.label;
        
        if (buttons.algoSelect.value === 'custom') {
            customSequence.push(selection.data.id);
            updateSequenceUI();
        } else if (buttons.algoSelect.value !== 'none') {
            buttons.runAlgo.disabled = false;
        }
    } else if (selection && selection.type === 'edge') {
        document.body.classList.add('selection-edge');
        buttons.directed.checked = selection.data.isDirected;
        buttons.nodeNameInput.value = graph.nextNodeName;
        buttons.runAlgo.disabled = true;
    } else {
        buttons.nodeNameInput.value = graph.nextNodeName;
        if (buttons.algoSelect.value !== 'custom') {
            buttons.runAlgo.disabled = true;
        }
    }
};

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    if (e.key === 's' || e.key === 'S') buttons.select.click();
    if (e.key === 'n' || e.key === 'N') buttons.addNode.click();
    if (e.key === 'e' || e.key === 'E') buttons.addEdge.click();
    if (e.key === 'Delete' || e.key === 'Backspace') graph.deleteSelected();

    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) graph.redo();
        else graph.undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        graph.redo();
    }
});

setActiveButton('select');

const defaultData = {
    "nodes": [
        { "id": "1", "label": "A", "x": 63, "y": 235 },
        { "id": "2", "label": "B", "x": -180, "y": 300 },
        { "id": "3", "label": "C", "x": -500, "y": 300 },
        { "id": "8", "label": "X", "x": -250, "y": -100 },
        { "id": "4", "label": "D", "x": -370, "y": -170 },
        { "id": "5", "label": "E", "x": 120, "y": -330 },
        { "id": "6", "label": "F", "x": 300, "y": -200 },
        { "id": "7", "label": "G", "x": 500, "y": 130 }
    ],
    "edges": [
        { "sourceId": "1", "targetId": "7", "isDirected": false, "weight": 5 },
        { "sourceId": "2", "targetId": "1", "isDirected": false, "weight": 3 },
        { "sourceId": "3", "targetId": "2", "isDirected": false, "weight": 4 },
        { "sourceId": "8", "targetId": "1", "isDirected": false, "weight": 4 },
        { "sourceId": "4", "targetId": "5", "isDirected": false, "weight": 5 },
        { "sourceId": "4", "targetId": "3", "isDirected": false, "weight": 6 },
        { "sourceId": "4", "targetId": "8", "isDirected": false, "weight": 2 },
        { "sourceId": "6", "targetId": "5", "isDirected": false, "weight": 2 },
        { "sourceId": "6", "targetId": "7", "isDirected": false, "weight": 4 }
    ],
    "settings": {
        "physics": { "repulsion": 400, "attraction": 0.01, "edgeLength": 200, "damping": 0.7 },
        "directedEdges": false, "nextNodeName": "", "isWeighted": true
    }
};

graph.deserialize(defaultData);
graph.centerGraph();

if (defaultData.settings) {
    if (defaultData.settings.physics) {
        buttons.edgeLength.value = defaultData.settings.physics.edgeLength;
        buttons.edgeLengthVal.textContent = defaultData.settings.physics.edgeLength;
    }
    buttons.directed.checked = defaultData.settings.directedEdges;
    buttons.nodeNameInput.value = defaultData.settings.nextNodeName || "";
    buttons.graphType.value = defaultData.settings.isWeighted ? 'weighted' : 'unweighted';
}

const container = document.getElementById('graph-container');
container.addEventListener('mousemove', (e) => {
    const pt = graph.getRelativePoint(e.clientX, e.clientY);
    const x = Math.round(pt.x);
    const y = Math.round(pt.y);

    buttons.coords.textContent = `X: ${x}, Y: ${y}`;
});
