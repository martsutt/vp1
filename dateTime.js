const monthNamesEt = ["jaanuar", "veebruar","märts","aprill","mai","juuni","juuli","august","september","oktoober","november","detsember"];
const weekdayNamesEt = ["pühapäev", "esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev"]

const dateEt = function(){
    let timeNow = new Date();    
    let weekdayNow = timeNow.getDay();    
    let dateNow = timeNow.getDate();      
    let monthNow = timeNow.getMonth();
    let yearNow = timeNow.getFullYear();
    return  weekdayNamesEt[weekdayNow] + " " + dateNow + ". " + monthNamesEt[monthNow] + " " + yearNow;
}
const kell = function(){
    let timeNow = new Date();
    let hourNow = timeNow.getHours();
    let minuteNow = timeNow.getMinutes();
    let secondNow = timeNow.getSeconds();
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
module.exports = {monthNamesEt,weekdayNamesEt,dateEt,kell, partofDay};