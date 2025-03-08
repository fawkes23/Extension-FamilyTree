export { MODULE_NAME };

const extensionName = 'Extension-FamilyTree';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const MODULE_NAME = 'FamilyTree';



//#############################//
//  Extension load             //
//#############################//

// This function is called when the extension is loaded
jQuery(async () => {
    const getContainer = () => $(document.getElementById('hello_container') ?? document.getElementById('extensions_settings'));
    const windowHtml = $(await $.get(`${extensionFolderPath}/window.html`));

    getContainer().append(windowHtml);
    //loadSettings();


    });




