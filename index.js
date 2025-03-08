// SillyTavern Family Tree Extension - Final Version
(function() {
    // Data structures
    const nodes = {};  // map of nodeId -> node object {id, name, gender, el}
    const relations = {}; // map of "minId_maxId" -> relation object
    let nextNodeId = 1;

    // DOM elements
    const container = document.getElementById('tree-container');
    const nodesLayer = document.getElementById('nodes-layer');
    const svgLines = document.getElementById('tree-lines');
    const selectionText = document.getElementById('selectionText');
    const singleControls = document.getElementById('singleSelectionControls');
    const relationControls = document.getElementById('relationControls');
    const relationTypeSelect = document.getElementById('relationType');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const closenessControl = document.getElementById('closenessControl');
    const closenessRange = document.getElementById('closenessRange');
    const closenessValue = document.getElementById('closenessValue');
    const addNodeBtn = document.getElementById('addNodeBtn');
    const removeNodeBtn = document.getElementById('removeNodeBtn');
    const toggleGenderBtn = document.getElementById('toggleGenderBtn');
    const importBtn = document.getElementById('importBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importFileInput = document.getElementById('importFile');

    // Current selection state
    let selectedNodes = [];  // store up to 2 selected node IDs

    // Utility: get relation key for two IDs (order-insensitive)
    function relKey(id1, id2) {
        return (id1 < id2) ? (id1 + "_" + id2) : (id2 + "_" + id1);
    }

    // Add a new node to the tree
    function addNode(name, gender = 'M') {
        const id = nextNodeId++;
        nodes[id] = { id, name, gender };
        // Create DOM element for node
        const nodeEl = document.createElement('div');
        nodeEl.classList.add('node');
        nodeEl.classList.add(gender === 'F' ? 'female' : 'male');
        nodeEl.dataset.id = id;
        // Node content: name and gender symbol
        const symbol = (gender === 'F') ? '♀' : '♂';
        nodeEl.innerHTML = name + ' <span class="gender-symbol">' + symbol + '</span>';
        // Click event for selecting node
        nodeEl.addEventListener('click', onNodeClick);
        // Append to layer and store reference
        nodesLayer.appendChild(nodeEl);
        nodes[id].el = nodeEl;
        updateLayout();
        return id;
    }

    // Remove a node (and any relations involving it)
    function removeNode(id) {
        if (!nodes[id]) return;
        // Remove any relations that include this node
        for (const key in relations) {
            const rel = relations[key];
            if (rel.a == id || rel.b == id || (rel.parent && (rel.parent == id || rel.child == id))) {
                delete relations[key];
            }
        }
        // Remove node from data and DOM
        const nodeEl = nodes[id].el;
        if (nodeEl) nodesLayer.removeChild(nodeEl);
        delete nodes[id];
        // Update selection if this node was selected
        if (selectedNodes.includes(id)) {
            selectedNodes = selectedNodes.filter(n => n != id);
        }
        updateSelectionUI();
    }

    // Connect two selected nodes with a relationship
    function connectNodes(id1, id2, relationType, closenessVal) {
        if (!id1 || !id2) return;
        const key = relKey(id1, id2);
        // Determine relation details
        const relObj = { a: id1, b: id2 };
        if (relationType === 'parent' || relationType === 'child') {
            // Store as 'parent' type with orientation
            relObj.type = 'parent';
            if (relationType === 'parent') {
                relObj.parent = id1;
                relObj.child = id2;
            } else {
                relObj.parent = id2;
                relObj.child = id1;
            }
        } else {
            // Sibling or spouse (undirected)
            relObj.type = relationType;
        }
        // Closeness
        relObj.closeness = (closenessVal !== undefined) ? parseInt(closenessVal) : 50;
        relations[key] = relObj;
        updateLayout();
        updateSelectionUI();
    }

    // Disconnect the relation between two selected nodes
    function disconnectNodes(id1, id2) {
        const key = relKey(id1, id2);
        if (relations[key]) {
            delete relations[key];
        }
        updateLayout();
        updateSelectionUI();
    }

    // Toggle gender of a single selected node
    function toggleGender(id) {
        if (!nodes[id]) return;
        const node = nodes[id];
        node.gender = (node.gender === 'M') ? 'F' : 'M';
        const el = node.el;
        if (el) {
            el.classList.toggle('male', node.gender === 'M');
            el.classList.toggle('female', node.gender === 'F');
            const symbolSpan = el.querySelector('.gender-symbol');
            if (symbolSpan) {
                symbolSpan.textContent = (node.gender === 'F') ? '♀' : '♂';
            }
        }
    }

    // Handle node click event
    function onNodeClick(e) {
        const nodeEl = e.currentTarget;
        const id = parseInt(nodeEl.dataset.id);
        if (!id) return;
        if (selectedNodes.includes(id)) {
            // Deselect if already selected
            selectedNodes = selectedNodes.filter(n => n !== id);
        } else {
            // Select new node
            if (selectedNodes.length >= 2) {
                // Reset if 2 already selected
                selectedNodes = [];
            }
            selectedNodes.push(id);
        }
        updateSelectionUI();
    }

    // Handle relationship line click event
    function onLineClick(e) {
        const lineEl = e.currentTarget;
        const id1 = parseInt(lineEl.dataset.id1);
        const id2 = parseInt(lineEl.dataset.id2);
        if (!id1 || !id2) return;
        selectedNodes = [id1, id2];
        updateSelectionUI();
    }

    // Update selection highlights and control visibility
    function updateSelectionUI() {
        // Clear all highlights
        document.querySelectorAll('.node.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.relation.selected').forEach(el => el.classList.remove('selected'));
        if (selectedNodes.length === 0) {
            selectionText.textContent = "Selected: none";
            singleControls.style.display = 'none';
            relationControls.style.display = 'none';
            return;
        }
        if (selectedNodes.length === 1) {
            const id = selectedNodes[0];
            const node = nodes[id];
            selectionText.textContent = "Selected: " + node.name;
            node.el.classList.add('selected');
            singleControls.style.display = '';
            relationControls.style.display = 'none';
            toggleGenderBtn.textContent = (node.gender === 'M' ? "Change to Female" : "Change to Male");
        } else if (selectedNodes.length === 2) {
            const id1 = selectedNodes[0];
            const id2 = selectedNodes[1];
            const node1 = nodes[id1];
            const node2 = nodes[id2];
            selectionText.textContent = "Selected: " + node1.name + " and " + node2.name;
            node1.el.classList.add('selected');
            node2.el.classList.add('selected');
            const rel = relations[relKey(id1, id2)];
            singleControls.style.display = 'none';
            relationControls.style.display = '';
            closenessControl.style.display = 'none';
            disconnectBtn.style.display = 'none';
            connectBtn.style.display = '';
            relationTypeSelect.value = "";
            if (rel) {
                disconnectBtn.style.display = '';
                connectBtn.style.display = 'none';
                if (rel.type === 'parent') {
                    relationTypeSelect.value = (rel.parent == id1) ? 'parent' : 'child';
                } else {
                    relationTypeSelect.value = rel.type;
                }
                closenessControl.style.display = '';
                closenessRange.value = rel.closeness;
                closenessValue.textContent = rel.closeness;
                const lineEl = svgLines.querySelector(`.relation[data-id1="${id1}"][data-id2="${id2}"], .relation[data-id1="${id2}"][data-id2="${id1}"]`);
                if (lineEl) lineEl.classList.add('selected');
            }
        }
    }

    // Auto-layout the family tree and render lines
    function updateLayout() {
        if (!container) return;
        if (Object.keys(nodes).length === 0) {
            svgLines.innerHTML = "";
            return;
        }
        // Determine spacing
        let maxWidth = 0, maxHeight = 0;
        for (const id in nodes) {
            const el = nodes[id].el;
            if (el) {
                const w = el.offsetWidth;
                const h = el.offsetHeight;
                if (w > maxWidth) maxWidth = w;
                if (h > maxHeight) maxHeight = h;
            }
        }
        const HSPACE = maxWidth + 40;
        const VSPACE = 120;
        // Assign initial levels based on parent relations
        for (const id in nodes) {
            nodes[id].level = 0;
        }
        let changed = true;
        while (changed) {
            changed = false;
            for (const key in relations) {
                const rel = relations[key];
                if (rel.type === 'parent') {
                    const p = rel.parent, c = rel.child;
                    const desiredLevel = nodes[p].level + 1;
                    if (desiredLevel > nodes[c].level) {
                        nodes[c].level = desiredLevel;
                        changed = true;
                    }
                }
            }
        }
        // Equalize levels for spouses
        for (const key in relations) {
            const rel = relations[key];
            if (rel.type === 'spouse') {
                const [idA, idB] = [rel.a, rel.b];
                const levelA = nodes[idA].level, levelB = nodes[idB].level;
                if (levelA !== levelB) {
                    const lowerId = (levelA < levelB) ? idA : idB;
                    const higherId = (levelA < levelB) ? idB : idA;
                    const diff = nodes[higherId].level - nodes[lowerId].level;
                    const raiseSubtree = (nodeId, d) => {
                        nodes[nodeId].level += d;
                        for (const k in relations) {
                            const r = relations[k];
                            if (r.type === 'parent' && r.parent == nodeId) {
                                raiseSubtree(r.child, d);
                            }
                        }
                        for (const k in relations) {
                            const r = relations[k];
                            if (r.type === 'spouse') {
                                if (r.a == nodeId && nodes[r.b].level < nodes[nodeId].level) {
                                    nodes[r.b].level = nodes[nodeId].level;
                                }
                                if (r.b == nodeId && nodes[r.a].level < nodes[nodeId].level) {
                                    nodes[r.a].level = nodes[nodeId].level;
                                }
                            }
                        }
                    };
                    raiseSubtree(lowerId, diff);
                }
            }
        }
        // Equalize levels for siblings
        for (const key in relations) {
            const rel = relations[key];
            if (rel.type === 'sibling') {
                const [idA, idB] = [rel.a, rel.b];
                if (nodes[idA].level !== nodes[idB].level) {
                    const maxLevel = Math.max(nodes[idA].level, nodes[idB].level);
                    nodes[idA].level = nodes[idB].level = maxLevel;
                }
            }
        }
        // Build parent->children map (choose one parent if multiple)
        const parentChildren = {};
        const childParents = {};
        for (const key in relations) {
            const rel = relations[key];
            if (rel.type === 'parent') {
                const p = rel.parent, c = rel.child;
                if (!parentChildren[p]) parentChildren[p] = [];
                parentChildren[p].push(c);
                if (!childParents[c]) childParents[c] = [];
                childParents[c].push(p);
            }
        }
        for (const c in childParents) {
            const parents = childParents[c];
            if (parents.length > 1) {
                // Keep the first parent in list, remove child from others
                const mainParent = parents[0];
                for (let i = 1; i < parents.length; i++) {
                    const other = parents[i];
                    if (parentChildren[other]) {
                        parentChildren[other] = parentChildren[other].filter(x => x != c);
                    }
                }
            }
        }
        // Determine connected components (to layout separately)
        const components = [];
        const visited = new Set();
        Object.keys(nodes).map(Number).forEach(id => {
            if (visited.has(id)) return;
            const comp = [];
            const queue = [id];
            visited.add(id);
            while (queue.length) {
                const nid = queue.shift();
                comp.push(nid);
                for (const key in relations) {
                    const rel = relations[key];
                    if (rel.a == nid && !visited.has(rel.b)) { visited.add(rel.b); queue.push(rel.b); }
                    if (rel.b == nid && !visited.has(rel.a)) { visited.add(rel.a); queue.push(rel.a); }
                    if (rel.type === 'parent') {
                        if (rel.parent == nid && !visited.has(rel.child)) { visited.add(rel.child); queue.push(rel.child); }
                        if (rel.child == nid && !visited.has(rel.parent)) { visited.add(rel.parent); queue.push(rel.parent); }
                    }
                }
            }
            components.push(comp);
        });
        // Compute positions for each component
        const positions = {};
        let globalOffsetX = 0;
        for (const comp of components) {
            const compRoots = comp.filter(nid => !Object.values(relations).some(rel => rel.type === 'parent' && rel.child == nid));
            compRoots.sort((a, b) => nodes[a].level - nodes[b].level);
            const placedRoots = new Set();
            let currentX = 0;
            function dfsPlace(nodeId) {
                const children = parentChildren[nodeId] ? parentChildren[nodeId].filter(cid => nodes[cid]) : [];
                if (children.length === 0) {
                    positions[nodeId] = { x: currentX, y: nodes[nodeId].level };
                    currentX += 1;
                } else {
                    children.forEach(childId => dfsPlace(childId));
                    let minX = Infinity, maxX = -Infinity;
                    children.forEach(childId => {
                        if (positions[childId].x < minX) minX = positions[childId].x;
                        if (positions[childId].x > maxX) maxX = positions[childId].x;
                    });
                    positions[nodeId] = { x: (minX + maxX) / 2, y: nodes[nodeId].level };
                }
            }
            for (const rootId of compRoots) {
                if (placedRoots.has(rootId)) continue;
                let spouseId = null;
                for (const key in relations) {
                    const rel = relations[key];
                    if (rel.type === 'spouse' && ((rel.a == rootId && compRoots.includes(rel.b)) || (rel.b == rootId && compRoots.includes(rel.a)))) {
                        spouseId = (rel.a == rootId ? rel.b : rel.a);
                        break;
                    }
                }
                if (spouseId && !placedRoots.has(spouseId)) {
                    dfsPlace(rootId);
                    if (positions[rootId] === undefined) {
                        positions[rootId] = { x: currentX, y: nodes[rootId].level };
                        currentX += 1;
                    }
                    dfsPlace(spouseId);
                    if (positions[spouseId] === undefined) {
                        positions[spouseId] = { x: currentX, y: nodes[spouseId].level };
                        currentX += 1;
                    }
                    placedRoots.add(rootId);
                    placedRoots.add(spouseId);
                } else {
                    dfsPlace(rootId);
                    if (positions[rootId] === undefined) {
                        positions[rootId] = { x: currentX, y: nodes[rootId].level };
                        currentX += 1;
                    }
                    placedRoots.add(rootId);
                }
                currentX += 1; // gap before next root
            }
            // Apply global offset and scale to pixels
            comp.forEach(nid => {
                if (positions[nid] !== undefined) {
                    positions[nid].x = positions[nid].x * HSPACE + globalOffsetX;
                    positions[nid].y = positions[nid].y * VSPACE;
                }
            });
            globalOffsetX += currentX * HSPACE;
        }
        // Update node element positions
        for (const id in nodes) {
            if (positions[id]) {
                const el = nodes[id].el;
                el.style.left = positions[id].x + 'px';
                el.style.top = positions[id].y + 'px';
            }
        }
        // Draw relationship lines
        svgLines.innerHTML = "";
        for (const key in relations) {
            const rel = relations[key];
            const idA = rel.a, idB = rel.b;
            if (!nodes[idA] || !nodes[idB]) continue;
            const rectA = nodes[idA].el.getBoundingClientRect();
            const rectB = nodes[idB].el.getBoundingClientRect();
            const xA = positions[idA].x + nodes[idA].el.offsetWidth / 2;
            const yA = positions[idA].y + nodes[idA].el.offsetHeight / 2;
            const xB = positions[idB].x + nodes[idB].el.offsetWidth / 2;
            const yB = positions[idB].y + nodes[idB].el.offsetHeight / 2;
            let pathD = "";
            if (rel.type === 'parent') {
                const xP = positions[rel.parent].x + nodes[rel.parent].el.offsetWidth / 2;
                const yP = positions[rel.parent].y + nodes[rel.parent].el.offsetHeight;
                const xC = positions[rel.child].x + nodes[rel.child].el.offsetWidth / 2;
                const yC = positions[rel.child].y;
                const midY = (yP + yC) / 2;
                pathD = `M ${xP},${yP} V ${midY} H ${xC} V ${yC}`;
            } else {
                pathD = `M ${xA},${yA} L ${xB},${yB}`;
            }
            const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathEl.setAttribute("d", pathD);
            pathEl.setAttribute("class", "relation" + (rel.type ? " " + rel.type : ""));
            pathEl.dataset.id1 = String(idA);
            pathEl.dataset.id2 = String(idB);
            const closenessVal = rel.closeness !== undefined ? rel.closeness : 50;
            const strokeW = 1 + (closenessVal / 100) * 3;
            pathEl.setAttribute("stroke-width", strokeW);
            if (rel.type === 'sibling') {
                pathEl.setAttribute("stroke-dasharray", "5,5");
            }
            svgLines.appendChild(pathEl);
            pathEl.addEventListener('click', onLineClick);
        }
    }

    // UI control event handlers
    addNodeBtn.addEventListener('click', () => {
        const name = prompt("Enter character name:");
        if (name && name.trim()) {
            addNode(name.trim());
        }
    });
    removeNodeBtn.addEventListener('click', () => {
        if (selectedNodes.length === 1) {
            removeNode(selectedNodes[0]);
        }
    });
    toggleGenderBtn.addEventListener('click', () => {
        if (selectedNodes.length === 1) {
            toggleGender(selectedNodes[0]);
            updateLayout();  // no need to relayout but can redraw if needed
            updateSelectionUI();
        }
    });
    connectBtn.addEventListener('click', () => {
        if (selectedNodes.length === 2) {
            const relType = relationTypeSelect.value;
            if (!relType) {
                alert("Please select a relationship type.");
                return;
            }
            connectNodes(selectedNodes[0], selectedNodes[1], relType, closenessRange.value);
        }
    });
    disconnectBtn.addEventListener('click', () => {
        if (selectedNodes.length === 2) {
            disconnectNodes(selectedNodes[0], selectedNodes[1]);
        }
    });
    relationTypeSelect.addEventListener('change', () => {
        if (selectedNodes.length === 2) {
            const key = relKey(selectedNodes[0], selectedNodes[1]);
            const rel = relations[key];
            if (rel) {
                const newType = relationTypeSelect.value;
                if (!newType) return;
                if (newType === 'parent' || newType === 'child') {
                    rel.type = 'parent';
                    if (newType === 'parent') {
                        rel.parent = selectedNodes[0];
                        rel.child = selectedNodes[1];
                    } else {
                        rel.parent = selectedNodes[1];
                        rel.child = selectedNodes[0];
                    }
                } else {
                    delete rel.parent;
                    delete rel.child;
                    rel.type = newType;
                }
                updateLayout();
                updateSelectionUI();
            }
        }
    });
    closenessRange.addEventListener('input', () => {
        closenessValue.textContent = closenessRange.value;
    });
    closenessRange.addEventListener('change', () => {
        if (selectedNodes.length === 2) {
            const rel = relations[relKey(selectedNodes[0], selectedNodes[1])];
            if (rel) {
                rel.closeness = parseInt(closenessRange.value);
                updateLayout();
                updateSelectionUI();
            }
        }
    });
    importBtn.addEventListener('click', () => {
        importFileInput.value = "";
        importFileInput.click();
    });
    importFileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.nodes && data.relationships) {
                        // Import a saved tree
                        Object.keys(nodes).forEach(id => removeNode(Number(id)));
                        for (const relKey in relations) {
                            delete relations[relKey];
                        }
                        nextNodeId = 1;
                        const idMap = {};
                        data.nodes.forEach(n => {
                            idMap[n.id] = addNode(n.name, n.gender);
                        });
                        data.relationships.forEach(r => {
                            const fromId = idMap[r.from];
                            const toId = idMap[r.to];
                            if (fromId && toId) {
                                connectNodes(fromId, toId, r.type, (r.closeness !== undefined ? r.closeness : 50));
                            }
                        });
                        selectedNodes = [];
                        updateSelectionUI();
                    } else if (data.char_name || data.name) {
                        // Import a single SillyTavern character
                        const charName = data.char_name || data.name;
                        addNode(charName);
                    } else {
                        alert("Unrecognized JSON format.");
                    }
                } catch (err) {
                    alert("Failed to import: " + err);
                }
            };
            if (file.name.toLowerCase().endsWith('.png')) {
                alert("PNG character cards are not supported. Please use JSON format.");
            } else {
                reader.readAsText(file);
            }
        });
    });
    exportBtn.addEventListener('click', () => {
        const exportData = { nodes: [], relationships: [] };
        for (const id in nodes) {
            exportData.nodes.push({ id: Number(id), name: nodes[id].name, gender: nodes[id].gender });
        }
        for (const key in relations) {
            const rel = relations[key];
            if (rel.type === 'parent') {
                exportData.relationships.push({
                    type: 'parent',
                    from: rel.parent,
                    to: rel.child,
                    closeness: rel.closeness
                });
            } else {
                exportData.relationships.push({
                    type: rel.type,
                    from: rel.a,
                    to: rel.b,
                    closeness: rel.closeness
                });
            }
        }
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "family_tree.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // On startup, add current persona as a node (using {{user}} macro)
    try {
        const userName = (typeof power_user !== 'undefined' && typeof user_avatar !== 'undefined')
            ? (power_user.personas?.[user_avatar] || user_avatar)
            : "{{user}}";
        if (userName && userName !== "{{user}}") {
            addNode(userName);
        }
    } catch (e) {
        // Persona info not available
    }
})();
