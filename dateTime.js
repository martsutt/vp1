const monthNamesEt = ["jaanuar", "veebruar","märts","aprill","mai","juuni","juuli","august","september","oktoober","november","detsember"];
const weekdayNamesEt = ["pühapäev", "esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev"]
const semesterStartDate = new Date("2024-09-02");

const dateEt = function(){
    let timeNow = new Date();
    //let specDate = new Date("12-27-1939");
    let weekdayNow = timeNow.getDay();    
    let dateNow = timeNow.getDate();      
    let monthNow = timeNow.getMonth();
    let yearNow = timeNow.getFullYear();
    return  weekdayNamesEt[weekdayNow] + " " + dateNow + ". " + monthNamesEt[monthNow] + " " + yearNow;
}

const givendateEt = function (gDate){
    let specDate = new Date(gDate);
    let day = specDate.getDate();
    let month = specDate.getMonth();
    let year = specDate.getFullYear();
    return day + ". " + monthNamesEt[month] + " " + year;
};

function sqlDateEt(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

const daysBetween = function(){
    let date1 = new Date("09/02/2024");
    let date2 = new Date();
    let timeDifference = date2.getTime() - date1.getTime();
    let daysDifference = Math.round(timeDifference / (1000 * 3600 * 24));
    if (daysDifference === 0) {
        return "Täna"; // Today
    } else if (daysDifference > 0) {
        return "Möödunud " + daysDifference + " päeva"; // Past days
    } else {
        return "Tuleb pärast " + Math.abs(daysDifference) + " päeva"; // Future days
    }
};

 const kell = function(){
    function addZero(i) {
        if(i<10) {
            i="0" + i;
        }
        return i;
    }
    let timeNow = new Date();
    let hourNow = addZero(timeNow.getHours());
    let minuteNow = addZero(timeNow.getMinutes());
    let secondNow = addZero(timeNow.getSeconds());
    return hourNow + ":" + minuteNow + ":" + secondNow;
}

const partofDay = function(){
    let dayPart = "suvaline hetk";
    let timeNow = new Date();
    let weekdayNow = timeNow.getDay();
    if (weekdayNow == 1 || weekdayNow == 2 || weekdayNow == 3 || weekdayNow == 4 || weekdayNow == 5 || weekdayNow == 6){ 
        if(timeNow.getHours() >= 8 && timeNow.getHours() < 16){
            dayPart="hetkel peaksid koolis olema";
        }
        if(timeNow.getHours() >= 16 && timeNow.getHours() < 22){
            dayPart="koolipaev on labi, puhka voi tee kodutoid";
         }
        if(timeNow.getHours() >= 22 && timeNow.getHours() < 6){
            dayPart="jää magama";
        }
        if(timeNow.getHours() >= 6 && timeNow.getHours() < 8){
            dayPart="tere hommikust, liigu kooli";
        }
    }
    else if (weekdayNow == 0){
        dayPart="täna ju pühapäev, puhka"
    }
    else if (weekdayNow == 7){
        dayPart="täna ju laupäev, puhka"
    }
    return dayPart;
}
module.exports = {monthNamesEt,weekdayNamesEt,dateEt,kell, partofDay, givendateEt, daysBetween, sqlDateEt};