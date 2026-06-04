class Graph {
    constructor(containerId) {
        this.svg = document.getElementById(containerId);
        this.viewport = document.getElementById('viewport');
        this.edgesLayer = document.getElementById('edges-layer');
        this.nodesLayer = document.getElementById('nodes-layer');
        this.nodes = new Map();
        this.edges = [];
        this.mode = 'select';
        this.selectedElement = null;
        this.edgeSourceNode = null;
        this.directedEdges = false;
        this.nextNodeName = "";
        this.transform = { x: 0, y: 0, k: 1 };
        this.repulsion = 400;
        this.attraction = 0.01;
        this.edgeLength = 150;
        this.damping = 0.7;
        this.isSleeping = false;
        this.energyThreshold = 0.01;
        this.onSelectionChange = null;
        this.onGraphUpdate = null;
        this.undoStack = [];
        this.redoStack = [];
        this.isRestoring = false;
        this.isWeighted = false;
        this.bfsController = null;
        this.initInteractions();
        this.animate();
        this.updateModeUI();
    }

    serialize() {
        return {
            nodes: Array.from(this.nodes.values()).map(n => ({
                id: n.id,
                label: n.label,
                x: n.x,
                y: n.y
            })),
            edges: this.edges.map(e => ({
                sourceId: e.source.id,
                targetId: e.target.id,
                isDirected: e.isDirected,
                weight: e.weight || 1,
                label: e.label || "1"
            })),
            settings: {
                transform: this.transform,
                physics: {
                    repulsion: this.repulsion,
                    attraction: this.attraction,
                    edgeLength: this.edgeLength,
                    damping: this.damping
                },
                directedEdges: this.directedEdges,
                nextNodeName: this.nextNodeName,
                isWeighted: this.isWeighted
            }
        };
    }

    deserialize(state) {
        this.isRestoring = true;
        this.clear();
        
        if (state.settings) {
            if (state.settings.transform) {
                this.transform = state.settings.transform;
                this.updateViewport();
            }
            if (state.settings.physics) {
                this.repulsion = state.settings.physics.repulsion ?? this.repulsion;
                this.attraction = state.settings.physics.attraction ?? this.attraction;
                this.edgeLength = state.settings.physics.edgeLength ?? this.edgeLength;
                this.damping = state.settings.physics.damping ?? this.damping;
            }
            this.directedEdges = state.settings.directedEdges ?? this.directedEdges;
            this.nextNodeName = state.settings.nextNodeName ?? this.nextNodeName;
            this.isWeighted = state.settings.isWeighted ?? this.isWeighted;
        }

        state.nodes.forEach(n => this.addNode(n.id, n.label, n.x, n.y));
        state.edges.forEach(e => {
            const edge = this.addEdge(e.sourceId, e.targetId, e.isDirected);
            if (edge) {
                edge.weight = e.weight || 1;
                edge.label = e.label || "1";
                this.updateEdgeLabelElement(edge);
            }
        });
        
        this.isRestoring = false;
        this.wake();
        this.notifyUpdate();
    }

    saveState() {
        if (this.isRestoring) return;
        const state = JSON.stringify(this.serialize());
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === state) return;
        this.undoStack.push(state);
        this.redoStack = [];
        if (this.undoStack.length > 50) this.undoStack.shift();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const currentState = JSON.stringify(this.serialize());
        this.redoStack.push(currentState);
        const prevState = JSON.parse(this.undoStack.pop());
        this.deserialize(prevState);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const currentState = JSON.stringify(this.serialize());
        this.undoStack.push(currentState);
        const nextState = JSON.parse(this.redoStack.pop());
        this.deserialize(nextState);
    }

    notifyUpdate() {
        if (this.onGraphUpdate) {
            this.onGraphUpdate(this.getGraphData());
        }
    }

    getGraphData() {
        const nodesArr = Array.from(this.nodes.values());
        const adjList = new Map();
        nodesArr.forEach(n => adjList.set(n.id, []));
        this.edges.forEach(e => {
            adjList.get(e.source.id).push({ id: e.target.id, weight: e.weight });
            if (!e.isDirected) {
                adjList.get(e.target.id).push({ id: e.source.id, weight: e.weight });
            }
        });

        const treeInfo = this.analyzeTree(nodesArr, adjList);

        return {
            nodes: nodesArr,
            edges: this.edges,
            adjList,
            treeInfo
        };
    }

    hasCycle(nodes, adjList) {
        const visited = new Set();
        const recStack = new Set();

        const checkCycleDirected = (nodeId) => {
            if (recStack.has(nodeId)) return true;
            if (visited.has(nodeId)) return false;

            visited.add(nodeId);
            recStack.add(nodeId);

            const neighbors = adjList.get(nodeId);
            for (const neighbor of neighbors) {
                if (checkCycleDirected(neighbor.id)) return true;
            }

            recStack.delete(nodeId);
            return false;
        };

        const checkCycleUndirected = (nodeId, parentId) => {
            visited.add(nodeId);
            const neighbors = adjList.get(nodeId);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.id)) {
                    if (checkCycleUndirected(neighbor.id, nodeId)) return true;
                } else if (neighbor.id !== parentId) {
                    return true;
                }
            }
            return false;
        };

        if (this.directedEdges) {
            for (const node of nodes) {
                if (!visited.has(node.id)) {
                    if (checkCycleDirected(node.id)) return true;
                }
            }
        } else {
            for (const node of nodes) {
                if (!visited.has(node.id)) {
                    if (checkCycleUndirected(node.id, null)) return true;
                }
            }
        }
        return false;
    }

    analyzeTree(nodes, adjList) {
        if (nodes.length === 0) return { isTree: false };
        const visited = new Set();
        const queue = [nodes[0].id];
        visited.add(nodes[0].id);
        
        let head = 0;
        while(head < queue.length) {
            const id = queue[head++];
            const neighbors = adjList.get(id) || [];
            for(const neighbor of neighbors) {
                if(!visited.has(neighbor.id)) {
                    visited.add(neighbor.id);
                    queue.push(neighbor.id);
                }
            }
        }
        const isConnected = visited.size === nodes.length;

        const isTree = isConnected && 
                       this.edges.length === nodes.length - 1 && 
                       !this.hasCycle(nodes, adjList);
        
        if (!isTree) return { isTree: false };

        let root = nodes[0];
        if (this.directedEdges) {
            const inDegrees = new Map();
            nodes.forEach(n => inDegrees.set(n.id, 0));
            this.edges.forEach(e => inDegrees.set(e.target.id, inDegrees.get(e.target.id) + 1));
            root = nodes.find(n => inDegrees.get(n.id) === 0) || nodes[0];
        }

        const leaves = [];
        const childrenMap = new Map();
        
        nodes.forEach(node => {
            const outEdges = this.edges.filter(e => e.source.id === node.id).map(e => e.target.id);
            childrenMap.set(node.id, outEdges);
            if (outEdges.length === 0) leaves.push(node);
        });

        return {
            isTree: true,
            root,
            leaves,
            childrenMap
        };
    }

    wake() {
        if (this.isSleeping) {
            this.isSleeping = false;
            this.animate();
        }
    }

    setMode(mode) {
        this.mode = mode;
        this.edgeSourceNode = null;
        this.deselectAll();
        this.updateModeUI();
    }

    updateModeUI() {
        document.body.className = `mode-${this.mode}`;
        const modeDisplay = document.getElementById('current-mode');
        if (modeDisplay) {
            modeDisplay.textContent = this.mode.charAt(0).toUpperCase() + this.mode.slice(1);
        }
    }

    setVisualScale(property, value) {
        document.documentElement.style.setProperty(`--${property}`, `${value}px`);
    }

    setPhysicsProperty(prop, value) {
        if (this.hasOwnProperty(prop)) {
            this[prop] = parseFloat(value);
            this.wake();
        }
    }

    addNode(id, label, x, y) {
        if (this.nodes.has(id)) return;
        this.saveState();
        const node = {
            id,
            label: label || id,
            x: x !== undefined ? x : Math.random() * this.svg.clientWidth,
            y: y !== undefined ? y : Math.random() * this.svg.clientHeight,
            vx: 0,
            vy: 0,
            fxed: false,
            element: null,
            circle: null
        };
        this.createNodeElement(node);
        this.nodes.set(id, node);
        this.wake();
        this.notifyUpdate();
        return node;
    }

    createNodeElement(node) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "node-group");
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "node");
        circle.setAttribute("r", "15");
        circle.dataset.id = node.id;
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "node-label");
        text.setAttribute("dy", "5");
        text.textContent = node.label;
        g.appendChild(circle);
        g.appendChild(text);
        this.nodesLayer.appendChild(g);
        node.element = g;
        node.circle = circle;
        this.updateNodePosition(node);
    }

    addEdge(sourceId, targetId, isDirected = false) {
        this.saveState();
        const source = this.nodes.get(sourceId);
        const target = this.nodes.get(targetId);
        if (!source || !target || source === target) return;
        const exists = this.edges.some(e =>
            (e.source === source && e.target === target) ||
            (!isDirected && e.source === target && e.target === source)
        );
        if (exists) return;
        const edge = {
            source,
            target,
            isDirected,
            weight: 1,
            label: "1",
            element: null,
            hitArea: null,
            group: null,
            labelGroup: null,
            labelText: null
        };
        this.createEdgeElement(edge);
        this.edges.push(edge);
        this.wake();
        this.notifyUpdate();
        return edge;
    }

    createEdgeElement(edge) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "edge-group");
        const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "line");
        hitArea.setAttribute("class", "edge-hit-area");
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", `edge ${edge.isDirected ? 'directed' : ''}`);
        g.appendChild(hitArea);
        g.appendChild(line);

        // Edge Label
        const lg = document.createElementNS("http://www.w3.org/2000/svg", "g");
        lg.setAttribute("class", "edge-label-group");
        lg.style.display = this.isWeighted ? 'block' : 'none';
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("class", "edge-label-bg");
        rect.setAttribute("rx", "4");
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "edge-label");
        text.textContent = edge.label;
        lg.appendChild(rect);
        lg.appendChild(text);
        g.appendChild(lg);

        this.edgesLayer.appendChild(g);
        edge.element = line;
        edge.hitArea = hitArea;
        edge.group = g;
        edge.labelGroup = lg;
        edge.labelText = text;

        g.addEventListener('pointerdown', (e) => {
            if (this.mode === 'select') {
                e.stopPropagation();
                this.selectEdge(edge);
            }
        });

        lg.addEventListener('pointerdown', (e) => {
            if (this.mode === 'select') {
                e.stopPropagation();
                const newVal = prompt("Enter edge weight:", edge.label);
                if (newVal !== null) {
                    this.updateEdgeLabel(edge, newVal);
                }
            }
        });

        this.updateEdgePosition(edge);
    }

    updateEdgeLabel(edge, newVal) {
        this.saveState();
        edge.label = newVal;
        const numericWeight = parseFloat(newVal);
        if (!isNaN(numericWeight)) {
            edge.weight = numericWeight;
        }
        this.updateEdgeLabelElement(edge);
        this.wake();
        this.notifyUpdate();
    }

    updateEdgeLabelElement(edge) {
        if (edge.labelText) {
            edge.labelText.textContent = edge.label;
            try {
                const bbox = edge.labelText.getBBox();
                const rect = edge.labelGroup.querySelector('.edge-label-bg');
                rect.setAttribute("x", bbox.x - 4);
                rect.setAttribute("y", bbox.y - 2);
                rect.setAttribute("width", bbox.width + 8);
                rect.setAttribute("height", bbox.height + 4);
            } catch (e) {} // BBox might fail if hidden
        }
    }

    updateNodeLabel(id, newLabel) {
        this.saveState();
        const node = this.nodes.get(id);
        if (node) {
            node.label = newLabel;
            const textElement = node.element.querySelector('.node-label');
            if (textElement) {
                textElement.textContent = newLabel;
            }
            this.notifyUpdate();
        }
    }

    initInteractions() {
        let draggedNode = null;
        let isPanning = false;
        let startPoint = { x: 0, y: 0 };
        this.svg.addEventListener('pointerdown', (e) => {
            const target = e.target;
            const pt = this.getRelativePoint(e.clientX, e.clientY);
            if (this.mode === 'addNode') {
                const id = Date.now().toString();
                const name = this.nextNodeName || `Node ${id.slice(-3)}`;
                this.addNode(id, name, pt.x, pt.y);
                return;
            }
            if (target.classList.contains('node')) {
                const node = this.nodes.get(target.dataset.id);
                if (this.mode === 'addEdge') {
                    if (!this.edgeSourceNode) {
                        this.edgeSourceNode = node;
                        this.selectNode(node);
                    } else {
                        this.addEdge(this.edgeSourceNode.id, node.id, this.directedEdges);
                        this.edgeSourceNode = null;
                        this.deselectAll();
                    }
                } else if (this.mode === 'select') {
                    draggedNode = node;
                    draggedNode.fxed = true;
                    this.selectNode(node);
                    this.svg.setPointerCapture(e.pointerId);
                    this.wake();
                }
            } else if (target.classList.contains('edge-hit-area')) {
            } else {
                if (this.mode === 'select') {
                    isPanning = true;
                    startPoint = { x: e.clientX, y: e.clientY };
                    this.deselectAll();
                }
            }
        });
        this.svg.addEventListener('pointermove', (e) => {
            if (draggedNode) {
                const pt = this.getRelativePoint(e.clientX, e.clientY);
                draggedNode.x = pt.x;
                draggedNode.y = pt.y;
                draggedNode.vx = 0;
                draggedNode.vy = 0;
                this.updateNodePosition(draggedNode);
                this.updateConnectedEdges(draggedNode);
                this.wake();
            } else if (isPanning) {
                const dx = e.clientX - startPoint.x;
                const dy = e.clientY - startPoint.y;
                this.transform.x += dx;
                this.transform.y += dy;
                startPoint = { x: e.clientX, y: e.clientY };
                this.updateViewport();
            }
        });
        const stop = () => {
            if (draggedNode) {
                draggedNode.fxed = false;
                this.saveState();
            }
            draggedNode = null;
            isPanning = false;
        };
        this.svg.addEventListener('pointerup', stop);
        this.svg.addEventListener('pointercancel', stop);
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = Math.pow(1.1, -e.deltaY / 100);
            const pt = this.getRelativePoint(e.clientX, e.clientY);
            const newScale = this.transform.k * factor;
            this.transform.x -= pt.x * (newScale - this.transform.k);
            this.transform.y -= pt.y * (newScale - this.transform.k);
            this.transform.k = newScale;
            this.updateViewport();
        }, { passive: false });
    }

    selectNode(node) {
        this.deselectAll();
        node.circle.classList.add('selected');
        this.selectedElement = { type: 'node', data: node };
        if (this.onSelectionChange) this.onSelectionChange(this.selectedElement);
    }

    selectEdge(edge) {
        this.deselectAll();
        edge.element.classList.add('selected');
        this.selectedElement = { type: 'edge', data: edge };
        if (this.onSelectionChange) this.onSelectionChange(this.selectedElement);
    }

    deselectAll() {
        this.nodes.forEach(n => n.circle.classList.remove('selected'));
        this.edges.forEach(e => e.element.classList.remove('selected'));
        this.selectedElement = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
    }

    deleteSelected() {
        if (!this.selectedElement) return;
        if (this.selectedElement.type === 'node') {
            this.removeNode(this.selectedElement.data.id);
        } else if (this.selectedElement.type === 'edge') {
            const edge = this.selectedElement.data;
            this.removeEdge(edge.source.id, edge.target.id);
        }
        this.selectedElement = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
        this.wake();
        this.notifyUpdate();
    }

    getRelativePoint(clientX, clientY) {
        const rect = this.svg.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.transform.x) / this.transform.k,
            y: (clientY - rect.top - this.transform.y) / this.transform.k
        };
    }

    updateViewport() {
        this.viewport.setAttribute("transform", `translate(${this.transform.x}, ${this.transform.y}) scale(${this.transform.k})`);
    }

    updateNodePosition(node) {
        node.element.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    }

    updateEdgePosition(edge) {
        if (!edge.element || !edge.hitArea) return;
        [edge.element, edge.hitArea].forEach(el => {
            el.setAttribute("x1", edge.source.x);
            el.setAttribute("y1", edge.source.y);
            el.setAttribute("x2", edge.target.x);
            el.setAttribute("y2", edge.target.y);
        });

        // Update label position
        if (edge.labelGroup) {
            const mx = (edge.source.x + edge.target.x) / 2;
            const my = (edge.source.y + edge.target.y) / 2;
            edge.labelGroup.setAttribute("transform", `translate(${mx}, ${my})`);
            this.updateEdgeLabelElement(edge);
        }
    }

    updateConnectedEdges(node) {
        this.edges.forEach(edge => {
            if (edge.source === node || edge.target === node) {
                this.updateEdgePosition(edge);
            }
        });
    }

    animate() {
        if (this.isSleeping) return;
        const step = () => {
            if (this.isSleeping) return;
            const totalEnergy = this.applyPhysics();
            this.nodes.forEach(node => this.updateNodePosition(node));
            this.edges.forEach(edge => this.updateEdgePosition(edge));
            if (totalEnergy < this.energyThreshold) {
                this.isSleeping = true;
                this.nodes.forEach(node => { node.vx = 0; node.vy = 0; });
                return;
            }
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    applyPhysics() {
        const nodesArr = Array.from(this.nodes.values());
        let totalEnergy = 0;
        for (let i = 0; i < nodesArr.length; i++) {
            for (let j = i + 1; j < nodesArr.length; j++) {
                const n1 = nodesArr[i];
                const n2 = nodesArr[j];
                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const distSq = dx * dx + dy * dy || 1;
                const force = this.repulsion / distSq;
                const fx = (dx / Math.sqrt(distSq)) * force;
                const fy = (dy / Math.sqrt(distSq)) * force;
                n1.vx -= fx; n1.vy -= fy;
                n2.vx += fx; n2.vy += fy;
            }
        }
        
        const graphData = this.getGraphData();
        const isTree = graphData.treeInfo.isTree;

        this.edges.forEach(edge => {
            const dx = edge.target.x - edge.source.x;
            const dy = edge.target.y - edge.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            const weight = (edge.weight !== undefined) ? edge.weight : 1;
            const effectiveWeight = Math.max(0.1, weight);
            const targetLength = (this.isWeighted && !isTree) ? this.edgeLength * effectiveWeight : this.edgeLength;
            
            const force = (dist - targetLength) * this.attraction;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            edge.source.vx += fx;
            edge.source.vy += fy;
            edge.target.vx -= fx;
            edge.target.vy -= fy;
        });
        nodesArr.forEach(node => {
            if (!node.fxed) {
                node.x += node.vx;
                node.y += node.vy;
                node.vx *= this.damping;
                node.vy *= this.damping;
            }
            totalEnergy += node.vx * node.vx + node.vy * node.vy;
        });
        return totalEnergy;
    }

    removeNode(id) {
        this.saveState();
        const node = this.nodes.get(id);
        if (!node) return;
        this.edges = this.edges.filter(edge => {
            if (edge.source === node || edge.target === node) {
                edge.group.remove();
                return false;
            }
            return true;
        });
        node.element.remove();
        this.nodes.delete(id);
        this.notifyUpdate();
    }

    removeEdge(sourceId, targetId) {
        this.saveState();
        this.edges = this.edges.filter(edge => {
            if (edge.source.id === sourceId && edge.target.id === targetId) {
                edge.group.remove();
                return false;
            }
            return true;
        });
        this.notifyUpdate();
    }

    clear() {
        if (!this.isRestoring) this.saveState();
        this.nodes.forEach(node => node.element.remove());
        this.edges.forEach(edge => edge.group.remove());
        this.nodes.clear();
        this.edges = [];
        this.selectedElement = null;
        this.wake();
        this.notifyUpdate();
    }

    setWeighted(weighted) {
        this.saveState();
        this.isWeighted = weighted;
        this.wake();
        this.notifyUpdate();
    }

    async runBFS(startNodeId, onStep) {
        this.clearHighlights();
        const startNode = this.nodes.get(startNodeId);
        if (!startNode) return;

        const controller = { aborted: false };
        this.bfsController = controller;

        const queue = [startNode];
        const visited = new Set([startNodeId]);
        const order = [];
        
        startNode.element.querySelector('.node').classList.add('processing');
        if (onStep) onStep({ queue: queue.map(n => n.label), order: order.map(n => n.label) });

        while (queue.length > 0 && !controller.aborted) {
            const current = queue.shift();
            order.push(current);
            
            current.element.querySelector('.node').classList.remove('processing');
            current.element.querySelector('.node').classList.add('visited');
            
            if (onStep) onStep({ 
                queue: queue.map(n => n.label), 
                order: order.map(n => n.label),
                currentNode: current.label 
            });

            await new Promise(r => setTimeout(r, 800));
            if (controller.aborted) break;

            const neighbors = this.getGraphData().adjList.get(current.id);
            for (const neighbor of neighbors) {
                if (controller.aborted) break;
                if (!visited.has(neighbor.id)) {
                    visited.add(neighbor.id);
                    const neighborNode = this.nodes.get(neighbor.id);
                    
                    const edge = this.edges.find(e => 
                        (e.source === current && e.target === neighborNode) ||
                        (!e.isDirected && e.source === neighborNode && e.target === current)
                    );
                    if (edge) edge.element.classList.add('traversed');

                    neighborNode.element.querySelector('.node').classList.add('processing');
                    queue.push(neighborNode);
                    
                    if (onStep) onStep({ 
                        queue: queue.map(n => n.label), 
                        order: order.map(n => n.label) 
                    });
                    await new Promise(r => setTimeout(r, 400));
                }
            }
        }
        this.bfsController = null;
    }

    stopAlgorithm() {
        if (this.bfsController) {
            this.bfsController.aborted = true;
        }
        this.clearHighlights();
    }

    clearHighlights() {
        this.nodes.forEach(n => {
            if(n.element) {
                const circle = n.element.querySelector('.node');
                if(circle) circle.classList.remove('visited', 'processing');
            }
        });
        this.edges.forEach(e => {
            if(e.element) e.element.classList.remove('traversed');
        });
    }
}
