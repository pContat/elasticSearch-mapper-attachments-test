"use strict";
//Read scheduled update from database and execute thm all
var updateModel = require('../../models/update.js');
var elasticService = require("../elasticService");
var elasticActions = require("./actionUpdate");
var elasticActionRefresh = require("./actionRefresh");
var utils = require("../../helper/utils");

//todo singleton 

var elasticUpdater = {
    //Boolean used to know if we can update now or wait
    curentUpdate: false,
    lastNumberWhenUpdate: 1,
    idInterval: null,
    //All results states after update
    state: [],
    timeBetweenUpdate: 5000,

    //Used of notify/listen form pgsql but we choose to use schedule update
    //The setInterval method returns a handle that you can use to clear the interval.
    start: function () {
        //elasticUpdater.idInterval = setInterval(elasticUpdater.executeUpdate, elasticUpdater.timeBetweenUpdate);
        elasticUpdater.executeUpdate();
    },

    wakeUp: function () {
        console.log("wake up");
        updateModel.unlisten();
        elasticUpdater.start();
    },

    sleep: function () {
        console.log("sleep");
        clearInterval(elasticUpdater.idInterval);
        updateModel.listenChannel("update", elasticUpdater.wakeUp);
    },

    //recursive function
    executeUpdate: function () {
        console.log("get downtime update")
        elasticUpdater.readUpdateTable().then(function (actionLength) {
            if (elasticUpdater.lastNumberWhenUpdate == 0 && actionLength == 0) {
                return elasticUpdater.sleep();
            }
            elasticUpdater.lastNumberWhenUpdate = actionLength;
            if (actionLength > 0) {
                console.log(elasticUpdater.state);
            }
            var rejectResult = elasticUpdater.state.filter(x => x.status === "rejected");
            var updateLength = elasticUpdater.state.length;
            console.log("Update todo :" + updateLength);
            console.log("Numbers of failed :" + rejectResult.length);
            rejectResult.forEach(function (element) {
                console.log(element.e);
            }, this);
            console.log("again");
            setTimeout( elasticUpdater.executeUpdate, 5000);

        }).catch(function (err) {
            console.log("in executeUpdate")
            console.log(err);
        })


    },

    //Daemon that do update every minute
    readUpdateTable: function () {
        return new Promise(function (resolve, reject) {
            if (!elasticUpdater.curentUpdate) {
                var updateIds = [];
                //dont't call update if another daemon is running
                elasticUpdater.curentUpdate = true;
                elasticUpdater.state = [];
                updateModel.getUpdates()
                    .then(function (rows) {
                        var actionPromises = [];
                        for (var row in rows) {
                            if (rows.hasOwnProperty(row)) {
                                var element = rows[row];
                                var table_name = element.table_name,
                                    log_data_id = element.update_id,
                                    type_id = element.type_id,
                                    op = element.op;
                                    
                                //use closure to pass element to action
                                actionPromises.push(new elasticActions(table_name, log_data_id, type_id, op));
                                updateIds.push(element.update_id);
                            }
                        }
                        if (actionPromises.length > 0) {
                            //refresh to allowed direct search after update
                            actionPromises.push( new elasticActionRefresh() );
                            return pseries(actionPromises)
                        } else {
                            return Promise.resolve();
                        }
                    })
                    .then(function (lastResult) {
                        //In case of no action
                        if (lastResult && lastResult.state == "rejected") {
                            elasticUpdater.state.push(lastResult);
                        }
                        elasticUpdater.curentUpdate = false;
                        //TODO handle rejected 
                        if (updateIds.length > 0) {
                            return updateModel.deleteUpdatesByIds(updateIds);
                        } else {
                            return Promise.resolve();
                        }
                    })
                    .then(function () {
                        resolve(elasticUpdater.state.length);
                    })
                    .catch(function (err) {
                        elasticUpdater.curentUpdate = false;
                        reject(err.message || err);
                    })
            }
            else {
                reject("Update already in progress")
            }
        })
    }
}

//Promise.all(), but which doesn't execute the promises in paralle
function pseries(list) {
    var p = Promise.resolve();
    var intialSize = list.length;
    //La méthode reduce() applique une fonction qui est un « accumulateur »
    // traite chaque valeur d'une liste (de la gauche vers la droite)
    // afin de la réduire à une seule valeur.
    return list.reduce(function (action, nextAction) {

        return action = action.then(function (res) {
            if (res) {
                //Store the result of every action
                elasticUpdater.state.push(res);
                console.log(elasticUpdater.state.length + " of " + intialSize);
            }
            return nextAction.promise;
        });
    }, p);

}



//Magic here with closure
// Si une des promesses de l'itérable est rejetée (n'est pas tenue), 
// la promesse all est rejetée immédiatement avec la valeur rejetée par la promesse en question, 
// d'ou l'utilisation de reflect
function createCallbackAction(element) {
    return function () {
        //return reflect(elasticActions.createActionUpdate(element));
        var table_name = element.table_name,
            log_data_id = element.update_id,
            type_id = element.type_id,
            op = element.op;
        return new elasticActions(table_name, log_data_id, type_id, op);
    };
}

//Not used anymore
// function actionResolver(actionDefiner, update_id, type_id) {
//     return new Promise(function (resolve, reject) {
//         actionDefiner
//             .then(function (message) {
//                 console.log(message);
//                 return updateModel.deleteUpdate(update_id, type_id)
//             })
//             .then(function () {
//                 resolve("action done");
//             })
//             .catch(function (err) {
//                 reject("Action resolver : " + (err.message || err));
//             })
//     })
// }

module.exports = elasticUpdater;
