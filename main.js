var boardNames = [];
var currentBoardName = '';
var backlogTypeName = 'BACKLOG';
var preferences = { isDarkMode: true };
var emptyBoard = { name: '', columns: [] };
var currentBoard = emptyBoard;

var defaultColumns = [
    {name: 'Backlog', cards: []},
    {name: 'ToDo', cards: []},
    {name: 'In Progress', cards: []},
    {name: 'Blocked', cards: []},
    {name: 'Done', cards: []},
    {name: 'Archive', cards: []}
]
//card = { text: string, textareaWidth, textareaHeight }
var allCards = {};
var selectedCardIndexes = {};

const BOARD_NAMES_STORAGE_KEY = 'board-names-json';
const CURRENT_BOARD_NAME_STORAGE_key = 'current-board-name';
var lastKeypressTimeoutRef = 0; 

function init() {
    loadData();
    bindUserEvents();
}

function loadData() {
    clearAllCards();
    boardNames = JSON.parse(localStorage.getItem(BOARD_NAMES_STORAGE_KEY)) ?? [];
    renderBoardsDdl();

    if (boardNames.length > 0) {
        $('.popup-welcome-message').hide();
        $('.info-esc-close-modal').show();
        updateCurrentBoardName(localStorage.getItem(CURRENT_BOARD_NAME_STORAGE_key) ?? boardNames[0]);
        //loadCardsForCurrentBoard(); //loadBoard
        loadBoard();
        renderBoard();
        //renderAllCards();
    } else {
        closePopup(); //close resets all the css properties
        $('.popup-overlay').show();
        $('.popup-overlay').find('.popup-close').hide();
        $('.popup-overlay').find('input').focus();
    }
}

function bindUserEvents() {
    $('.top-bar-select').on('change', onBoardSelectChange);
    $('.top-bar-button').on('click', function() {onTopBarButtonClick($(this))});
    $('#new-board-add-button').on('click', onNewBoardNameAddClick);
    $('.popup-close').on('click', closePopup);
    $('.popup-archive').find('.popup-button').on('click', function() { onPopupArchiveButtonClick($(this))});
    
    $(document).on('keydown', function(event) { onKeyDown(event) });
    $('.board').on('click', '.column-add', function() { onAddNewCardClick($(this))});
    $('.board').on('click', '.card-edit' ,function() { onEditCardButtonClick($(this))});
    $('.board').on('click', '.card-action' ,function() { onEditCardActionClick($(this))});
    $('.board').on('click', '.card', function() { onCardClick($(this))});
    $('.board').on('click', '.card-action-save' ,function() { onEditCardSaveClick($(this))});
    $('.board').on('click', '.card-action-undo' ,function() { onEditCardUndoClick($(this))});
   
    $('.modal-close').on('click', function() {$('.modal-overlay').hide()});
    $('.modal-button-copy').on('click', onModalCopyClick );
    $('.modal-button-save').on('click', onModalSaveClick );
    $('.modal-button-clear').on('click', function () { $('.modal-textarea').val('') });
    $('.modal-button-apply').on('click', onModalApplyClick );
}

function onPopupArchiveButtonClick(buttonElement) {
    if ($(buttonElement).hasClass('archive-current-board-button')) {
        var result = confirm(`You are about to archive the current board. You can unarchive it by creating new board with the exact same name, ${currentBoardName}. It must match identically to unarchive. Are you sure you want to proceed ?`);
        
        if(result) {
            var index = boardNames.indexOf(currentBoardName);
            boardNames.splice(index,1);
            localStorage.setItem(BOARD_NAMES_STORAGE_KEY, JSON.stringify(boardNames));
            alert(`${currentBoardName} has been achived.`);
            currentBoardName = null;
            localStorage.removeItem(CURRENT_BOARD_NAME_STORAGE_key);
            loadData();
        }
    } else if ($(buttonElement).hasClass('delete-current-board-button')) {
        var result = confirm('You are about to permanently delete the current board. This can not be undone. Are you sure you want to proceed ?');
        
        if(result) {
            deleteBoard(currentBoardName);
            loadData();
        }
    } else if ($(buttonElement).hasClass('delete-all-boards-button')) {
        var result = confirm('You are about to DELETE ALL DATA. This can not be undone. Are you sure you want to proceed ?')
        if(result) {
            _clearLocalStorage();
        }
    }

    closePopup();
}

function deleteBoard(boardNameToDelete) {
    var index = boardNames.indexOf(boardNameToDelete);
    boardNames.splice(index, 1);
    localStorage.setItem(BOARD_NAMES_STORAGE_KEY, JSON.stringify(boardNames));
    var storageItemName = generateLocalStorageItemName(boardNameToDelete);
    localStorage.removeItem(storageItemName);

    if ($('#board-select').val() == -1) {
        currentBoardName = null;
        localStorage.removeItem(CURRENT_BOARD_NAME_STORAGE_key);
        alert(`${boardNameToDelete} has been deleted.`);
    }
}

function closePopup() {
    $('.popup-close').show();
    $('.rename-board-element').hide();
    $('.add-board-element').show();
    $('.popup-new-board-name').show();
    $('.popup-archive').hide();
    $('.popup-welcome-message').hide();
    $('.popup-overlay').hide();
    
    $('#board-select option').filter(function () {
        return $(this).text() == currentBoardName;
    }).prop('selected', true);
}

function onKeyDown(event) {
    var isEditingAndFocus = $(document.activeElement).hasClass('card-textarea');

    if (isEditingAndFocus && event.which != 27)
        return;

    var isEditing = $('.board').find('.card-editing').length > 0;

    if (isNaN(selectedCardIndexes?.columnIndex * selectedCardIndexes?.cardIndex)) {
        clearSelectedCard();
    }

    switch (event.which) {
        case 37: // Left arrow
            $('.card-selected').find('.card-action-left').trigger('click');
           break;
        case 38: // Up arrow
            $('.card-selected').find('.card-action-up').trigger('click');
            break;
        case 39: // Right arrow
            $('.card-selected').find('.card-action-right').trigger('click');
            break;
        case 40: // Down arrow
            $('.card-selected').find('.card-action-down').trigger('click');
            break;
        case 27: // escape
            if (isEditing) {
                $('.card-editing').find('.card-action-save').trigger('click');
                return;
            } else {
                clearSelectedCard();
                $('.modal-overlay').hide();

                if(boardNames.length > 0) {
                    closePopup();
                }
            }
            break;
        case 13: //enter
            if ($('#board-select').val() != '-1' && $('#board-select').val() != '-2') {
                $('.column').first().find('.column-add').trigger('click');
            }
            
            break;        
        default:
            clearSelectedCard();
            return;
    }

    if(!isEditing) {
        event.preventDefault();
    }

    //To do! Consider removing the code below. User can unselect by hitting escape.
    window.clearTimeout(lastKeypressTimeoutRef);
    window.setTimeout(function() {
        lastKeypressTimeoutRef = window.setTimeout(function () {
            clearSelectedCard();
        }, 60000);
    }, 0);
}

function onCardClick(cardElement) {
    var shouldEdit = $(cardElement).hasClass('card-selected');

    clearSelectedCard();

    if($(cardElement).hasClass('card-editing')) 
        return;

    if(shouldEdit) {
        $(cardElement).find('.card-edit').trigger('click');
    } else {
        $(cardElement).addClass('card-selected');
        var parentColumnBodyElement = $(cardElement).parents('.column-body');
        var cardIndex = $(cardElement).data('card-index');
        let columnIndex = $('.column-body').index(parentColumnBodyElement);
        selectedCardIndexes = { columnIndex, cardIndex };
    }
}

function onModalApplyClick() {
    try {
        const dataObject = JSON.parse($('.modal-textarea').val());
        localStorage.clear();

        Object.keys(dataObject).forEach(key => {
            localStorage.setItem(key, dataObject[key]);
        });
    
        loadData();
        alert('restore successful');
    } catch (error) {
        alert("Failed to restore data:" + error);
    }

    $('.modal-overlay').hide();
}

function onModalCopyClick() {
    navigator.clipboard.writeText($('.modal-textarea').val());
}

function onModalSaveClick() {
    try {
        const textContent = $('.modal-textarea').val();
        const blob = new Blob([textContent], { type: 'text/plain' || 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `LocalTaskboard-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // Free up memory
    } catch (exp) {
        alert('save failed:' + exp?.Message);
    }
} 

function onTopBarButtonClick(buttonElement) {
    if($(buttonElement).hasClass('info-button')) {
        $('.popup-section').hide();
        $('.popup-overlay').show();
        $('#new-board-popup').find('input').val('').focus();
        $('.popup-new-board-name').hide();
        $('.popup-welcome-message').show();
        $('#info-esc-close-modal-text').show();
    } else if ($(buttonElement).hasClass('archive-button')){
        $('.popup-section').hide();
        $('.popup-archive').show();
        $('.popup-overlay').show();
        $('.popup-close').show();
    } else {
        $('.modal-overlay').show();
        $('.modal-export, .modal-import').hide();

        if($(buttonElement).hasClass('export-button')) {
            $('.modal-export').show();
            $('.modal-overlay').find('textarea').val(JSON.stringify(localStorage));
            $('modal-button-save').hide();
            $('modal-button-copy').show();
        } else if($(buttonElement).hasClass('import-button')) {
            $('.modal-import').show();
            $('.modal-overlay').find('textarea').val('');
            $('modal-button-save').hide();
            $('modal-button-copy').show();
        }
    }
}

function clearSelectedCard() {
    window.clearTimeout(lastKeypressTimeoutRef);
    $('.card-selected').removeClass('card-selected');
    selectedCardIndexes = {};
}

function onEditCardActionClick(buttonElement) { //This is for move and delete, need to rename. Also see onEditCardButtonClick. 
    var parentCardElement = $(buttonElement).parents('.card');
    var shouldReAddCardSelectedClass = $(parentCardElement).hasClass('card-selected');
    clearSelectedCard();

    if ($(buttonElement).hasClass('card-action-undo') || $(buttonElement).hasClass('card-action-save'))
        return;

    var parentColumnBodyElement = $(buttonElement).parents('.column-body');
    var cards = $(parentColumnBodyElement).data('cards');
    var cardIndex = $(parentCardElement).data('card-index');
    var cardText = $(parentCardElement).find('.card-content').text();
    var card = { text: cardText};
    var parentColumnBodyElementIndex = $('.column-body').index(parentColumnBodyElement);
    var newCardIndex = cardIndex;
    var newColumnIndex = parentColumnBodyElementIndex;

    if($(buttonElement).hasClass('card-action-up') && cardIndex != 0) {
        newCardIndex -= 1;
        moveArrayElement(cards, cardIndex, newCardIndex);
    } else if ($(buttonElement).hasClass('card-action-down') && cardIndex < cards.length) {
        newCardIndex += 1;
        moveArrayElement(cards, cardIndex, newCardIndex);
    } else if ($(buttonElement).hasClass('card-action-left') && parentColumnBodyElementIndex != 0) {
        cards.splice(cardIndex, 1);
        newColumnIndex -=1;
        var prevColumnElement = $('.column-body').get(newColumnIndex);
        var prevColumnData = $(prevColumnElement).data('cards');
        prevColumnData.unshift(card);
        newCardIndex = Math.min(newCardIndex, prevColumnData.length - 1);
        moveArrayElement(prevColumnData, 0, newCardIndex);
        renderCards($(prevColumnElement));
    } else if ($(buttonElement).hasClass('card-action-right') && parentColumnBodyElementIndex <  $('.column-body').length - 1) {
        cards.splice(cardIndex, 1);
        newColumnIndex += 1;
        var nextColumnElement = $('.column-body').get(newColumnIndex);
        var nextColumnData = $(nextColumnElement).data('cards');
        nextColumnData.unshift(card);
        newCardIndex = Math.min(newCardIndex, nextColumnData.length - 1);
        moveArrayElement(nextColumnData, 0, newCardIndex);
        renderCards($(nextColumnElement));
    } else if ($(buttonElement).hasClass('card-action-top') && cardIndex < cards.length) {
        newCardIndex = 0;
        moveArrayElement(cards, cardIndex, newCardIndex);
    } else if ($(buttonElement).hasClass('card-action-bottom') && cardIndex < cards.length) {
        newCardIndex = cards.length - 1;
        moveArrayElement(cards, cardIndex, newCardIndex);
    } else if ($(buttonElement).hasClass('card-action-remove') && parentColumnBodyElementIndex < $('.column-body').length - 1) {
        clearSelectedCard();
        cards.splice(cardIndex, 1);
        var archiveColumnElement = $('.column-body').last();
        var archiveColumnData = $(archiveColumnElement).data('cards');
        archiveColumnData.unshift(card);
        renderCards($(archiveColumnElement));
    } else if ($(buttonElement).hasClass('card-action-remove') && parentColumnBodyElementIndex == $('.column-body').length - 1) {
        clearSelectedCard();
        cards.splice(cardIndex, 1);
    } else {
        return;
    }

    saveCurrentBoard();
    renderCards($(parentColumnBodyElement));

    if(shouldReAddCardSelectedClass) {
        window.setTimeout(function() {
            var newCardElement = $($('.column-body').get(newColumnIndex)).find('.card').get(newCardIndex);
            $(newCardElement).trigger('click');
        }, 0);
    }
}

function moveArrayElement(arr, fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
    console.error("Indices are out of bounds.");
    return arr;
  }

  const [element] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, element);

  return arr;
}

function onEditCardButtonClick(buttonElement) {
    var parentCardElement = $(buttonElement).parents('.card');
    var cardIndex = $(parentCardElement).data('card-index');
    var cardText = $(parentCardElement).find('.card-content').text();
    var newEditingCard = $('templates').find('.card-editing').clone();
    $(newEditingCard).data('card-index', cardIndex);
    $(newEditingCard).data('undo', cardText);
    $(parentCardElement).replaceWith(newEditingCard);
    $(newEditingCard).find('textarea').val(cardText).focus();
}

function onEditCardSaveClick(buttonElement) {
    var parentCardElement = $(buttonElement).parents('.card-editing'); 
    var cardIndex = $(parentCardElement).data('card-index');
    var cardText = $(parentCardElement).find('textarea').val();
    var card = { text: cardText };
    var parentColumnBodyElement = $(buttonElement).parents('.column-body');
    var cards = $(parentColumnBodyElement).data('cards');
    var newCardIndex = -1;

    if(cardIndex == -1) {
        if(cardText.trim().length > 0) {
            newCardIndex = 0;
            cards.unshift(card);
            saveCurrentBoard();
        } else {
            $(parentCardElement).remove();
            return;
        }
    } else if((cards?.length ?? 0) < (cardIndex + 1)) {
        alert('Error#59. Try refreshing the page');
        return;
    } else {
        newCardIndex = cardIndex;
        cards[cardIndex] = card;
        saveCurrentBoard();
    }

    var cardClone = $('templates').children('.card').first().clone();
    $(cardClone).data('card-index', newCardIndex);
    $(cardClone).children('.card-content').text(cardText);
    $(parentCardElement).replaceWith(cardClone);
    
    if (newCardIndex != -1) {
        window.setTimeout(function() {
            $($(parentColumnBodyElement).find('.card').get(newCardIndex)).trigger('click');
        }, 0);
    }
}

function onEditCardUndoClick(buttonElement) {
    var parentCardElement = $(buttonElement).parents('.card-editing'); 
    var cardIndex = $(parentCardElement).data('card-index');

    var textForUndo = cardIndex == -1 ? '' : $(parentCardElement).data('undo');
    $(parentCardElement).find('textarea').val(textForUndo);
}

function onAddNewCardClick(buttonElement) {
    var newEditingCard = $('templates').find('.card-editing').clone();
    $(newEditingCard).data('card-index', -1);
    var columnElement = $(buttonElement).parents('.column');
    $(columnElement).children('.column-body').prepend(newEditingCard);
    $(columnElement).find('textarea').first().focus().val('');
}

function updateCurrentBoardName(boardName) {
    currentBoardName = boardName;
    $('.top-bar-title').find('span').text(boardName);
    localStorage.setItem(CURRENT_BOARD_NAME_STORAGE_key, currentBoardName);

    $('#board-select option').filter(function () {
        return $(this).text() == currentBoardName;
    }).prop('selected', true);
}

function renderBoardsDdl() {
    var htmlString = '';

    for (let bn of boardNames) {
       htmlString += `<option class="board-option">${bn}</option>`;
    }

    htmlString += '<option id="new-board-option" value="-1">...New Board</option>';
    htmlString += '<option id="new-board-option" value="-2">...Rename Board</option>';
    $('#board-select').empty().append(htmlString);
}

function onBoardSelectChange() {
    if ($('.top-bar-select').val() == -1) {
        $('#new-board-popup').show();
        $('#new-board-popup').find('input').val('').focus();
        $('.popup-new-board-name').show();
        $('.popup-welcome-message').hide();
        $('#new-board-close-button').show();
        $('.rename-board-element').hide();
        $('.add-board-element').show();
    } else if ($('.top-bar-select').val() == -2) { 
        $('.rename-board-element').show();
        $('.add-board-element').hide();
        $('#new-board-popup').show();
        $('#new-board-popup').find('input').val(currentBoardName).focus();
        $('.popup-new-board-name').show();
        $('.popup-welcome-message').hide();
        $('#new-board-close-button').show();
    } else {
       currentBoardName = $('.top-bar-select').val();
       updateCurrentBoardName(currentBoardName);
       loadData();
    }
}

function onNewBoardNameAddClick() { //this is now also for unarchive and rename
    var newBoardName = $('#board-name-input').val();
    var alertMessage = $('#board-select').val() == -1 ?
        'That name is invalid or too similar to an existing. Try again. Note if you have entered the name of an archived board, it has been restored.':
        'That name is invalid or too similar to an existing. Try again.';

    if (!checkNewBoardName(newBoardName)) {
        alert(alertMessage);
        return;
    }

    var previousBoardName = currentBoardName;
    updateCurrentBoardName(newBoardName);
    updateBoardNames(newBoardName);

    var isNewBoard = $('#board-select').val() == -1;

    if (isNewBoard) {
        createNewBoard(newBoardName);
    }

    saveCurrentBoard();
    
    if ($('#board-select').val() == -2) {
        deleteBoard(previousBoardName);
    }

    loadData();
    $('#new-board-popup').hide();

    if (isNewBoard) {
        $('.column').first().find('.column-add').trigger('click');

        window.setTimeout(function() {
            $('#backlog-column-body').find('.card-editing').find('textarea').attr('placeholder', 'Welcome. Start typing here...');
        }, 0);
    }
}

function createNewBoard(newBoardName) {
    currentBoard = { name: newBoardName, columns: [...defaultColumns] };
}

function updateBoardNames(newBoardName) {
    boardNames.unshift(newBoardName);
    localStorage.setItem(BOARD_NAMES_STORAGE_KEY, JSON.stringify(boardNames));
}

function clearAllCards() {
    allCards = {}; 
    allCards.backlogItems = [];
    allCards.todoItems = [];
    allCards.inProgressItems = [];
    allCards.blockedItems = [];
    allCards.doneItems = [];
    allCards.backlogItems = [];
}

function checkNewBoardName(newBoardName) {
    try {
        if(generateLocalStorageItemName(newBoardName).length == 0)
            return false;
        
        var result = JSON.parse(localStorage.getItem(generateLocalStorageItemName(newBoardName)));
        
        if (result != null && $('#board-select').val() == -1) {
            //The user is restoring an archived board
            $('#new-board-popup').hide();
            updateBoardNames(newBoardName);
            updateCurrentBoardName(newBoardName);
            loadData();
            return false;
        } else if(result != null) {
            return false;
        } else {
            var testString = 'TEST'; 
            localStorage.setItem(generateLocalStorageItemName(newBoardName), testString);
            result = localStorage.getItem(generateLocalStorageItemName(newBoardName));
            localStorage.removeItem(generateLocalStorageItemName(newBoardName));

            return result == testString;
        }    
    } catch {
        return false;
    }
}

function generateLocalStorageItemName(boardName) {
    var whiteSpaceStrippedName = boardName.replaceAll(' ', '');

    return whiteSpaceStrippedName.length == 0 ? '' : `${whiteSpaceStrippedName}-board-json`;
}

function saveCurrentBoard() {
    var storageItemName = generateLocalStorageItemName(currentBoardName);
    var boardJson = JSON.stringify(currentBoard);
    localStorage.setItem(storageItemName, boardJson);
}

function loadBoard() {
    $('.board').empty(); 
    var storageItemName = generateLocalStorageItemName(currentBoardName);
    currentBoard = JSON.parse(localStorage.getItem(storageItemName)) ?? emptyBoard;
}

function loadCardsForCurrentBoardXX() {
    $('.column-body').empty();

    var storageItemName = generateLocalStorageItemName(currentBoardName);
    allCards = JSON.parse(localStorage.getItem(storageItemName)) ?? [];
    
    if (allCards.length = 0) {
        clearAllCards();
    } else {
        allCards.backlogItems = allCards.backlogItems ?? [];
        allCards.todoItems = allCards.todoItems ?? [];
        allCards.inProgressItems = allCards.inProgressItems ?? [];
        allCards.blockedItems = allCards.blockedItems ?? [];
        allCards.doneItems = allCards.doneItems ?? [];
        allCards.archiveItems =  allCards.archiveItems ?? [];
    }

    $('#backlog-column-body').data('cards', allCards.backlogItems);
    $('#todo-column-body').data('cards', allCards.todoItems);
    $('#in-progress-column-body').data('cards', allCards.inProgressItems);
    $('#blocked-column-body').data('cards', allCards.blockedItems);
    $('#done-column-body').data('cards', allCards.doneItems);
    $('#archive-column-body').data('cards', allCards.archiveItems);
}

function renderBoard() {
    $('.board').empty();

    for (let c of currentBoard.columns) {
        var columnClone = $('templates').children('.column').first().clone();
        $(columnClone).find('.column-title').text(c.name);
        $(columnClone).find('.column-body').data('cards', c.cards);
        $('.board').append($(columnClone));
    }

    $('.board').find('.coumn').last().addClass('column-archive');
    renderAllCards();
}

function renderAllCards() {
    $('.board').find('.column-body').each(function() {
        renderCards($(this));
    });
}

function renderCards(columnBodyElement) {
    $(columnBodyElement).find('.card-editing').each(function() {
        $(this).find('.card-action-save').trigger('click');
    })

    if($(columnBodyElement).find('.card-editing'))

    $(columnBodyElement).empty();
    var cards = $(columnBodyElement).data('cards');

    for (var i = 0; i < cards.length; i++) {
        var text = cards[i].text;
        var cardClone = $('templates').children('.card').first().clone();
        $(cardClone).data('card-index', i);
        $(cardClone).children('.card-content').text(text);
        $(columnBodyElement).append($(cardClone));
    }

    if (preferences.isDarkMode) {
        $(columnBodyElement).find('.card').addClass('card-dark-mode');
    }
}

function _listLocalStorage() {
    Object.entries(localStorage).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
    });
}

function _clearLocalStorage() {
    if(confirm('Consider an Export before continuing. Are you sure you want to delete all boards permanently ?')) {
        localStorage.clear();
        window.location.reload();
    }
}