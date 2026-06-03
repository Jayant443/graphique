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
        this.directedEdges = true;
        this.nextNodeName = "";
        this.transform = { x: 0, y: 0, k: 1 };
        this.repulsion = 400;
        this.attraction = 0.01;
        this.edgeLength = 150;
        this.gravity = 0;
        this.damping = 0.7;
        this.isSleeping = false;
        this.energyThreshold = 0.01;
        this.onSelectionChange = null;
        this.initInteractions();
        this.animate();
        this.updateModeUI();
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
            element: null,
            hitArea: null,
            group: null
        };
        this.createEdgeElement(edge);
        this.edges.push(edge);
        this.wake();
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
        this.edgesLayer.appendChild(g);
        edge.element = line;
        edge.hitArea = hitArea;
        edge.group = g;
        g.addEventListener('pointerdown', (e) => {
            if (this.mode === 'select') {
                e.stopPropagation();
                this.selectEdge(edge);
            }
        });
        this.updateEdgePosition(edge);
    }
    updateNodeLabel(id, newLabel) {
        const node = this.nodes.get(id);
        if (node) {
            node.label = newLabel;
            const textElement = node.element.querySelector('.node-label');
            if (textElement) {
                textElement.textContent = newLabel;
            }
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
            if (draggedNode) draggedNode.fxed = false;
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
        this.edges.forEach(edge => {
            const dx = edge.target.x - edge.source.x;
            const dy = edge.target.y - edge.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - this.edgeLength) * this.attraction;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            edge.source.vx += fx; edge.source.vy += fy;
            edge.target.vx -= fx; edge.target.vy -= fy;
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
    }
    removeEdge(sourceId, targetId) {
        this.edges = this.edges.filter(edge => {
            if (edge.source.id === sourceId && edge.target.id === targetId) {
                edge.group.remove();
                return false;
            }
            return true;
        });
    }
    clear() {
        this.nodes.forEach(node => node.element.remove());
        this.edges.forEach(edge => edge.group.remove());
        this.nodes.clear();
        this.edges = [];
        this.selectedElement = null;
        this.wake();
    }
}
