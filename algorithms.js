class GraphAlgorithms {
    constructor(graph) {
        this.graph = graph;
    }

    async runShortestPath(startNodeId, endNodeId, onStep) {
        this.graph.clearHighlights();
        const startNode = this.graph.nodes.get(startNodeId);
        const endNode = this.graph.nodes.get(endNodeId);
        if (!startNode || !endNode) return;

        const controller = { aborted: false };
        this.graph.algoController = controller;

        const adj = this.graph.getGraphData().adjList;
        const distances = new Map();
        const previous = new Map();
        const nodes = Array.from(this.graph.nodes.values());

        nodes.forEach(node => {
            distances.set(node.id, Infinity);
            previous.set(node.id, null);
        });
        distances.set(startNodeId, 0);

        const unvisited = new Set(nodes.map(n => n.id));

        if (onStep) onStep({ message: `Calculating path from ${startNode.label} to ${endNode.label}...` });

        while (unvisited.size > 0 && !controller.aborted) {
            let currentId = null;
            let minDistance = Infinity;
            unvisited.forEach(id => {
                if (distances.get(id) < minDistance) {
                    minDistance = distances.get(id);
                    currentId = id;
                }
            });

            if (currentId === null || minDistance === Infinity) break;
            if (currentId === endNodeId) break;

            unvisited.delete(currentId);
            const current = this.graph.nodes.get(currentId);
            current.element.querySelector('.node').classList.remove('processing');
            current.element.querySelector('.node').classList.add('visited');

            if (onStep) onStep({ message: `Exploring from ${current.label}...` });
            await new Promise(r => setTimeout(r, 800));
            if (controller.aborted) break;

            const neighbors = adj.get(currentId);
            for (const neighbor of neighbors) {
                if (controller.aborted) break;
                if (!unvisited.has(neighbor.id)) continue;

                const neighborNode = this.graph.nodes.get(neighbor.id);
                const weight = this.graph.isWeighted ? neighbor.weight : 1;
                const alt = distances.get(currentId) + weight;
                if (alt < distances.get(neighbor.id)) {
                    distances.set(neighbor.id, alt);
                    previous.set(neighbor.id, currentId);

                    neighborNode.element.querySelector('.node').classList.add('processing');

                    if (onStep) onStep({ message: `Relaxing edge to ${neighborNode.label}: new distance ${alt}` });
                    await new Promise(r => setTimeout(r, 400));
                }
            }
        }

        const path = [];
        let curr = endNodeId;
        while (curr !== null) {
            path.unshift(this.graph.nodes.get(curr));
            curr = previous.get(curr);
        }

        if (path[0].id !== startNodeId) {
            this.graph.algoController = null;
            return { path: null, distance: Infinity };
        }

        this.graph.clearHighlights();
        for (let i = 0; i < path.length; i++) {
            path[i].element.querySelector('.node').classList.add('visited');
            if (i > 0) {
                const source = path[i - 1];
                const target = path[i];
                const edge = this.graph.edges.find(e =>
                    (e.source === source && e.target === target) ||
                    (!e.isDirected && e.source === target && e.target === source)
                );
                if (edge) edge.element.classList.add('traversed');
            }
        }

        this.graph.algoController = null;
        return {
            path,
            distance: distances.get(endNodeId)
        };
    }

    async runBFS(startNodeId, onStep) {
        this.graph.clearHighlights();
        const startNode = this.graph.nodes.get(startNodeId);
        if (!startNode) return;

        const controller = { aborted: false };
        this.graph.algoController = controller;

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

            const neighbors = this.graph.getGraphData().adjList.get(current.id);
            for (const neighbor of neighbors) {
                if (controller.aborted) break;
                if (!visited.has(neighbor.id)) {
                    visited.add(neighbor.id);
                    const neighborNode = this.graph.nodes.get(neighbor.id);

                    const edge = this.graph.edges.find(e =>
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
        this.graph.algoController = null;
    }

    async runDFS(startNodeId, onStep) {
        this.graph.clearHighlights();
        const startNode = this.graph.nodes.get(startNodeId);
        if (!startNode) return;

        const controller = { aborted: false };
        this.graph.algoController = controller;

        const visited = new Set();
        const order = [];
        const stack = [];

        const dfs = async (node) => {
            if (controller.aborted) return;

            visited.add(node.id);
            order.push(node);
            stack.push(node);

            node.element.querySelector('.node').classList.add('processing');
            if (onStep) onStep({
                stack: stack.map(n => n.label),
                order: order.map(n => n.label),
                currentNode: node.label
            });

            await new Promise(r => setTimeout(r, 800));
            if (controller.aborted) return;

            node.element.querySelector('.node').classList.remove('processing');
            node.element.querySelector('.node').classList.add('visited');

            const neighbors = this.graph.getGraphData().adjList.get(node.id);
            for (const neighbor of neighbors) {
                if (controller.aborted) return;
                if (!visited.has(neighbor.id)) {
                    const neighborNode = this.graph.nodes.get(neighbor.id);

                    const edge = this.graph.edges.find(e =>
                        (e.source === node && e.target === neighborNode) ||
                        (!e.isDirected && e.source === neighborNode && e.target === node)
                    );
                    if (edge) edge.element.classList.add('traversed');

                    await dfs(neighborNode);

                    if (controller.aborted) return;
                }
            }
            stack.pop();
            if (onStep) onStep({
                stack: stack.map(n => n.label),
                order: order.map(n => n.label),
                currentNode: stack.length > 0 ? stack[stack.length - 1].label : null
            });
            await new Promise(r => setTimeout(r, 400));
        };

        await dfs(startNode);
        this.graph.algoController = null;
    }
}
