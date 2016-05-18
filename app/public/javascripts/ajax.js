//get buttonSearch, search string, auth level
var buttonSearch = document.querySelector("#submitButton");
var inputSearch = document.querySelector("#inputSearch");
var userPrivilege = document.querySelector("#userPrivilege");

var extToType = {
    ".doc": "doc"
    , ".docx": "doc"
    , ".pdf": "pdf"
    , ".pptx": "ppt"
};

//set eventlidtener onclick call function 
buttonSearch.addEventListener("click", ajaxCall);

function ajaxCall(evt) {
    evt.preventDefault();
    var xhr = null;

    if (window.XMLHttpRequest || window.ActiveXObject) {
        if (window.ActiveXObject) {
            try {
                xhr = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }
        } else {
            xhr = new XMLHttpRequest();
        }
    } else {
        console.log("Votre navigateur ne supporte pas l'objet XMLHTTPRequest...");
        return;
    }

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 0)) {
            readAndDisplayData(xhr.responseText);
        }
    };

    //akax vers /search?search=XX&authLevel=XX
    xhr.open("GET", "/search?search=" + inputSearch.value + "&userAuth=" + userPrivilege.value, true);
    xhr.send(null);

}

function readAndDisplayData(data) {

    $(".result").remove();
    $(".noResult").remove();
    $("#resultPanel").hide();
    var myObject = JSON.parse(data);
    var nom = "";
    var text = "";
    if (myObject.hasOwnProperty("error")) {
        console.log(myObject.error);
        noResult(myObject.error);
        $("#resultPanel").slideDown(500);
    }
    else {
        for (node in myObject) {
            nom = myObject[node]._source.attachment._name;
            text = myObject[node].highlight['attachment.content'][0];
            console.log(myObject[node]._source.attachment._name);
            createItem(nom, text);
        }
        $("#resultPanel").slideDown(500);
    }
}

function createItem(nom, text) {
    var imgResult;
    var parentElement = $("#resultPanel");
    var cb = $(".cb")
    var result = $("<div class='result'></div>");
    var resultImage = $("<div class='result-image'></div>")
    var type = getType(nom);
    switch (type) {
        case "doc":
            resultImage.addClass("blue");
            imgResult = $("<img src='/images/documentIcon.png' class='imgResult'>");
            break;
        case "pdf":
            resultImage.addClass("red");
            imgResult = $("<img src='/images/pdfIcon.png' class='imgResult'>");
            break;
        default:
            resultImage.addClass("green");
            imgResult = $("<img src='/images/babillardIcon.png' class='imgResult'>");
            break;
    }
    var resultText = $("<div class='result-text'></div>");
    var name = nom.slice(0, 16);
    name += "...";

    var documentTitle = $("<h3>" + name + "</h3>");
    var documentHighlight = $("<p>" + text + "</p>");

    resultText.append(documentTitle);
    resultText.append(documentHighlight);
    resultImage.append(imgResult);
    result.append(resultImage);
    result.append(resultText);
    cb.before(result);


}

function noResult(text) {
    var cb = $(".cb");
    var noResult = $("<div class='noResult'></div>");
    var textNoResult = $("<h3>" + text + "</h3>");
    
    noResult.append(textNoResult);
    cb.before(noResult);
}

function getExt(path) {
    var i = path.lastIndexOf('.');
    return (i < 0) ? '' : path.substr(i);
}

function getType(path) {
    var ext = this.getExt(path);
    if (ext !== "" && this.extToType.hasOwnProperty(ext)) {
        return this.extToType[ext];
    } else return "unknown"
}