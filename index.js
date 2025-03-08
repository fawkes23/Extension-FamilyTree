export { MODULE_NAME };

const extensionName = 'Extension-FamilyTree';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const MODULE_NAME = 'FamilyTree';

//#############################//
//  Extension load and setup   //
//#############################//

// This function runs when the extension is loaded (document ready)
jQuery(async () => {
    // Append the extension UI HTML to the SillyTavern extensions container
    const getContainer = () => $(document.getElementById('hello_container') ?? document.getElementById('extensions_settings'));
    const windowHtml = $(await $.get(`${extensionFolderPath}/window.html`));
    getContainer().append(windowHtml);

    // Data structure for family members and relationships
    let familyData = {};

    // Load saved family tree data from localStorage (if any)
    const savedData = localStorage.getItem('familyTreeData');
    if (savedData) {
        try {
            familyData = JSON.parse(savedData);
        } catch (e) {
            console.error('Failed to parse saved family tree data:', e);
            familyData = {};
        }
    }

    // Update the options in the Parent and Child select dropdowns
    function updateSelectOptions() {
        const $parentSelect = $('#familytree_parent_select');
        const $childSelect = $('#familytree_child_select');
        // Clear current options
        $parentSelect.empty();
        $childSelect.empty();
        // Add placeholder options
        $parentSelect.append(new Option('Parent', '', true, true)).find('option').prop('disabled', true);
        $childSelect.append(new Option('Child', '', true, true)).find('option').prop('disabled', true);
        // Populate with all character names (sorted)
        const names = Object.keys(familyData).sort();
        for (const name of names) {
            $parentSelect.append(new Option(name, name));
            $childSelect.append(new Option(name, name));
        }
        // Ensure placeholder remains selected
        $parentSelect.prop('selectedIndex', 0);
        $childSelect.prop('selectedIndex', 0);
    }

    // Render the family tree structure in the display area
    function renderTree() {
        const $treeContainer = $('#familytree_display');
        $treeContainer.empty();  // clear current tree display
        // If no characters in data, show a placeholder message
        const allNames = Object.keys(familyData);
        if (allNames.length === 0) {
            $treeContainer.text('No family members.');
            return;
        }
        // Determine root nodes (those with no parents)
        const rootNames = [];
        for (const name of allNames) {
            const person = familyData[name];
            if (!person.parents || person.parents.length === 0) {
                rootNames.push(name);
            }
        }
        // If no root (circular reference scenario), fall back to all names as roots
        if (rootNames.length === 0) {
            rootNames.push(...allNames);
        }
        rootNames.sort();
        // Helper function to recursively build the tree list
        const visited = new Set();
        function buildTreeNode(personName) {
            if (visited.has(personName)) {
                // Prevent infinite loops in case of cyclic relationships
                return $();  // return empty element (skip rendering this node again)
            }
            visited.add(personName);
            const person = familyData[personName];
            const $li = $('<li/>');
            // Create node element with person's name
            const $nameElem = $('<a/>').attr('href', '#').text(personName);
            $li.append($nameElem);
            // If this person has children, render them as a nested list
            if (person.children && person.children.length > 0) {
                const $childList = $('<ul/>');
                for (const childName of person.children) {
                    const $childNode = buildTreeNode(childName);
                    if ($childNode && $childNode.length) {
                        $childList.append($childNode);
                    }
                }
                if ($childList.children().length > 0) {
                    $li.append($childList);
                }
            }
            visited.delete(personName);
            return $li;
        }
        // Build and append each root family branch
        for (const rootName of rootNames) {
            const $rootList = $('<ul/>');
            $rootList.append(buildTreeNode(rootName));
            $treeContainer.append($rootList);
        }
    }

    // Utility to check if adding a relationship would create a cycle
    function isDescendantOf(targetName, ancestorName) {
        if (ancestorName === targetName) return true;
        // DFS through children to see if target appears in ancestor's subtree
        const stack = [...(familyData[ancestorName]?.children || [])];
        const visitedNodes = new Set();
        while (stack.length) {
            const curr = stack.pop();
            if (curr === targetName) {
                return true;
            }
            if (visitedNodes.has(curr)) continue;
            visitedNodes.add(curr);
            const children = familyData[curr]?.children || [];
            for (const child of children) {
                stack.push(child);
            }
        }
        return false;
    }

    // Add a new character to the familyData
    function addCharacter(name) {
        if (!name) return;
        if (familyData[name]) {
            alert('Character "' + name + '" already exists.');
            return;
        }
        // Create new character entry
        familyData[name] = { name: name, parents: [], children: [] };
        // Persist data and update UI
        localStorage.setItem('familyTreeData', JSON.stringify(familyData));
        updateSelectOptions();
        renderTree();
    }

    // Add a parent-child relationship between existing characters
    function addRelationship(parentName, childName) {
        if (!parentName || !childName) return;
        if (parentName === childName) {
            alert('A character cannot be parent of themselves.');
            return;
        }
        // Ensure both characters exist
        if (!familyData[parentName] || !familyData[childName]) {
            alert('Parent or child character not found.');
            return;
        }
        // Check if this relationship already exists
        if (familyData[parentName].children.includes(childName)) {
            alert(`Relationship already exists: ${parentName} is already a parent of ${childName}.`);
            return;
        }
        // Prevent cyclic relationships
        if (isDescendantOf(parentName, childName)) {
            alert('Cannot add relationship: it would create a cycle in the family tree.');
            return;
        }
        // Add the relationship
        familyData[parentName].children.push(childName);
        familyData[childName].parents.push(parentName);
        // Persist data and update UI
        localStorage.setItem('familyTreeData', JSON.stringify(familyData));
        renderTree();
    }

    // Trigger a download of the current familyData as a JSON file
    function saveDataAsJSON() {
        const dataStr = JSON.stringify(familyData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'family_tree.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Load family tree data from a JSON string and refresh the UI
    function loadFromJSONContent(jsonText) {
        try {
            const dataObj = JSON.parse(jsonText);
            // Validate and set the new data
            if (typeof dataObj !== 'object') throw new Error('Invalid format');
            familyData = dataObj;
            // Ensure structure has expected arrays
            for (const name in familyData) {
                const person = familyData[name];
                if (!Array.isArray(person.parents)) person.parents = [];
                if (!Array.isArray(person.children)) person.children = [];
            }
            // Update local storage with loaded data
            localStorage.setItem('familyTreeData', JSON.stringify(familyData));
            updateSelectOptions();
            renderTree();
        } catch (e) {
            alert('Failed to load family tree JSON: ' + e.message);
            console.error('JSON load error:', e);
        }
    }

    // Event handlers for UI interactions

    // Add character on button click or Enter key in name input
    $('#familytree_add_char_btn').on('click', () => {
        const name = $('#familytree_name_input').val().trim();
        addCharacter(name);
        $('#familytree_name_input').val('');  // clear input field
    });
    $('#familytree_name_input').on('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const name = $('#familytree_name_input').val().trim();
            addCharacter(name);
            $('#familytree_name_input').val('');
        }
    });

    // Add relationship on button click
    $('#familytree_add_rel_btn').on('click', () => {
        const parentName = $('#familytree_parent_select').val();
        const childName = $('#familytree_child_select').val();
        if (!parentName || !childName) {
            alert('Please select both a parent and a child.');
            return;
        }
        addRelationship(parentName, childName);
    });

    // Save JSON button
    $('#familytree_save_btn').on('click', () => {
        saveDataAsJSON();
    });

    // Load JSON button opens file chooser
    $('#familytree_load_btn').on('click', () => {
        $('#familytree_file_input').trigger('click');
    });
    // When a file is selected, read it and load data
    $('#familytree_file_input').on('change', function() {
        const file = this.files[0];
        if (!file) return;
        file.text().then(text => {
            loadFromJSONContent(text);
        });
        // Reset the input so the same file can be loaded again if needed
        this.value = '';
    });

    // Initial render of UI with any loaded data
    updateSelectOptions();
    renderTree();
});
