```javascript
   var ServerPath = "remote server URL";

    var TutorialPath = "";
    var TutorialLanguage = "";
    var TutorialManifest;
    var FeedbackNumber = 0;
    var totPages = 0;
    var totSections = 0;
    var currentPagePointer  = 0;
    var QcurrentPagePointer = 0;
    var PageType = "";
    var doc;
    
    var x = new XMLHttpRequest();

    function changeTutorial() {
        tP = document.getElementById("tutorialList").value;
        totSections = 0;
        if (tP == "") {
            AudioObj.pause();
            document.getElementById("Title").innerHTML = "";
            document.getElementById("tutorialSection").style.display = "none";
        } else {
            document.getElementById("tutorialSection").style.display = "block";
            TutorialPath = tP;
            x.open("GET", ServerPath + TutorialPath + "/mobile/A2.xml", true);
            x.onreadystatechange = function () {
                if (x.readyState == 4 && x.status == 200) {
                    doc = x.responseXML;
                    setTutorialParameters();
                    movePage(0);
                }
            };
            x.send(null);
        }
    }

    function setTutorialParameters() {
        TutorialManifest = doc.getElementsByTagName("s");
        totPages = TutorialManifest.length;
        for (i = 0; i < totPages; i++) if (TutorialManifest[i].getAttribute("p") == "s") totSections++;
        Title = doc.getElementsByTagName("Title")[0].textContent;
        TutorialLanguage =  doc.getElementsByTagName("Language")[0].textContent;
        document.getElementById("Title").innerHTML = "<b>Title</b>: " + Title +  " <small><b>Language</b>: " + TutorialLanguage + "<small>";
        AudioObj = document.getElementById("Audio");
        bntNext = document.getElementById("btnNext");
        bntPrevious = document.getElementById("btnPrevious");
        PageObject = document.getElementById("Main");
        currentPagePointer = 0;
    }

    function movePage(Step) {
        if (PageType != "" || Step == 1) currentPagePointer = currentPagePointer + Step; else currentPagePointer = QcurrentPagePointer;
        if (currentPagePointer > 0) btnPrevious.disabled = false; else btnPrevious.disabled = true;
        QcurrentPagePointer = currentPagePointer;
        if (currentPagePointer < totPages - 1) {
            PageType = TutorialManifest[currentPagePointer].getAttribute("p");

            fileExt = ".png"
            if (TutorialManifest[currentPagePointer].getAttribute("a") == "1") fileExt = ".gif"
            if (PageType == "s") fileExt = "_S.png"

            Main = ServerPath + TutorialPath + "/mobile/slides/m_" + TutorialManifest[currentPagePointer].getAttribute("f") + fileExt;
            AudioObj.src = ServerPath + TutorialPath + "/mobile/sound/m_s" + TutorialManifest[currentPagePointer].getAttribute("f") + ".mp3";

            if (PageType == "q") {
                bntNext.disabled = true;
                FeedbackNumber = TutorialManifest[currentPagePointer].getElementsByTagName("f").length;
            } else {
                glossaryNumber = TutorialManifest[currentPagePointer].getElementsByTagName("g").length;
                bntNext.disabled = false;
                FeedbackNumber = 0;
            }
        } else {
            bntNext.disabled = true;
            if ( TutorialLanguage == "Spanish" ) LanguageExt = "_s"; else LanguageExt = "";
            Main = ServerPath + "common/end" + LanguageExt + ".gif";
            AudioObj.src = ServerPath + "common/end" + LanguageExt + ".mp3";
        }
        document.getElementById("Main").src = Main;
        AudioObj.play();
        document.getElementById("pageNo").textContent = (currentPagePointer + 1) + " / " + totPages;
    }

    function PageClick(e) {
        var rect = e.target.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;

        pcntX = parseInt(100 * x / PageObject.width);
        pcntY = parseInt(100 * y / PageObject.height);

        if (PageType == "s") {
            if ( 20 < pcntX && pcntX < 80 ) JumpToSection(y);
        } else if (PageType == "c") {
            movePage(0);
        } else if (PageType == "g" || PageType == "c") {
            movePage(1);
        } else {

            BTN = 0;
            if (PageType == "q") {
                for (j = 1; j <= FeedbackNumber; j++) {
                    ButtonLimits = TutorialManifest[currentPagePointer].getAttribute("b" + j).split(",");
                    if (parseInt(ButtonLimits[0]) < pcntX && pcntX < parseInt(ButtonLimits[2]) && parseInt(ButtonLimits[1]) < pcntY && pcntY < parseInt(ButtonLimits[3])) BTN = j;
                }
            }
            for (j = 1; j <= glossaryNumber; j++) {
                ButtonLimits = TutorialManifest[currentPagePointer].getAttribute("b" + j).split(",");
                if (parseInt(ButtonLimits[0]) < pcntX && pcntX < parseInt(ButtonLimits[2]) && parseInt(ButtonLimits[1]) < pcntY && pcntY < parseInt(ButtonLimits[3])) BTN = j;
            }
            if (BTN > 0) {
                if (PageType == "q") {
                    Main = ServerPath + TutorialPath + "/mobile/slides/m_" + TutorialManifest[currentPagePointer].getElementsByTagName("f")[BTN - 1].getAttribute("f") + ".png";
                    AudioObj.src = ServerPath + TutorialPath + "/mobile/sound/m_s" + TutorialManifest[currentPagePointer].getElementsByTagName("f")[BTN - 1].getAttribute("f") + ".mp3";
                } else {
                    Main = ServerPath + TutorialPath + "/mobile/slides/m_" + TutorialManifest[currentPagePointer].getElementsByTagName("g")[BTN - 1].getAttribute("w") + ".png";
                    AudioObj.src = ServerPath + TutorialPath + "/mobile/sound/" + TutorialManifest[currentPagePointer].getElementsByTagName("g")[BTN - 1].getAttribute("w") + "_s_m.mp3";
                }

                document.getElementById("Main").src = Main;
                AudioObj.play();
                QcurrentPagePointer = currentPagePointer;
                if (PageType != "q" || BTN != parseInt(TutorialManifest[currentPagePointer].getAttribute("ca"))) currentPagePointer--;
                if (PageType == "o") PageType = "g"; else PageType = "";
                bntNext.disabled = false;
            }

        }
    }

    function Credits() {
        Main = ServerPath + TutorialPath + "/mobile/slides/credits.png";
        document.getElementById("Main").src = Main;
        PageType = "c";
    }

    function JumpToSection(absY) {
        SEC = parseInt((((absY * 480) / PageObject.height) - 75) * totSections / 380) + 1;
        var SecFind = 0;
        for (k = 0; k < totPages; k++) {
            if (TutorialManifest[k].getAttribute("p") == "s") SecFind++;
            if (SecFind == SEC) {
                currentPagePointer = k;
                movePage(0);
                break;
            }
        }
    }

    function Manifest() {
        const manifestWindow = window.open(ServerPath + TutorialPath + "/mobile/A2.xml", "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=50,left=50,width=800,height=400");
    }
```
