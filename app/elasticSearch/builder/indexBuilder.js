"use strict";
//Class that build request to send to elastic search serveur
const conf = require("../../config"),
    indexName = conf.elastic.mainIndex,
    utils = require("../../helper/utils"),
    striptags = require('striptags');


const elasticIndexBuilder = {

//Group_ids optional
    createDocument: function (row, group_ids) {
        const base64file = utils.base64_encode('../'+row.path);
        const fileSize = Buffer.byteLength(base64file);
        const ids = group_ids || [];
        if( fileSize > 104857600) {
            return false;
        }
        //id is set in url sent to elastic : http POST elastic/index/type/id
        const requestData = {
            // using the _indexed_chars parameter. -1 can be set to extract all text
            // but note that all the text needs to be allowed to be represented in memory
            "_indexed_chars" : -1,
            "attachment": {
                "_content": base64file,
                "_name": row.label,
                "_content_length": fileSize
            },
            "document_type": utils.getType(row.path),
            "insertDate": row.registration,
            "document_id": row.file_id,
            "version_id": row.version_id,
            //if not set , add values instead of add to array
            "groups_ids": ids,
            "created_by": row.user_id
        };
        return requestData;
    },

    updateDocumentVersion: function (row) {
        //id is set in url sent to elastic : http POST elastic/index/type/id
        return {
            "doc": {
                "attachment": {
                    "_name": row.label,
                },
                "insertDate": utils.getTodayDateFormat(),
            }
        };
    },

    //Files are in config/script under elasticSearch folder
    addGroupToFile: function (group_id, document_id) {
        const requestData = {
            "query": {
                "term": {
                    "document_id": document_id
                }
            },
            "script": {
                "file": "addGroupUpdate",
                "params": {
                    "new_group": group_id,
                    "fieldToUpdate": "groups_ids"
                }
            }

        };
        return requestData;
    },

    removeGroupToDocument: function (group_id, document_id) {
        return {
            "query": {
                "term": {
                    "document_id": document_id
                }
            },
            "script": {
                "file": "removeGroupUpdate",
                "params": {
                    "new_group": group_id,
                    "fieldToUpdate": "groups_ids"
                }
            }
        };
    },

    createPin: function (row) {
        let ids = row.group_ids || [];
        let vote = row.vote || 0;

        const requestData = {
            "layout_label": row.layout_label,
            //Striptag remove html tags
            "pin_content": striptags(row.pin_label),
            "pinboard_label": row.pinboard_label,
            "pin_vote": vote,
            "insertDate": row.registration,
            "layout_id": row.layout_id,
            "pin_id": row.pin_id,
            "pinboard_id": row.pinboard_id,
            "groups_ids": ids,
            "created_by": row.user_id,
            //TODO : use constant from builder
            "document_type" : "pin",
        };
        return requestData;
    },

    updatePin: function (row, groupIds) {
        return {
            doc: {
                "pin_content": row.label
            }
        };


    },

    addGroupToPinboard: function (group_id, pinboard_id) {
        return {
            "query": {
                "term": {
                    "pinboard_id": pinboard_id
                }
            },
            "script": {
                "file": "addGroupUpdate",
                "params": {
                    "new_group": group_id,
                    "fieldToUpdate": "groups_ids"
                }
            }
        };
    },

    removeGroupToPinboard: function (group_id, pinboard_id) {
        return {
            "query": {
                "term": {
                    "pinboard_id": pinboard_id
                }
            },
            "script": {
                "file": "removeGroupUpdate",
                "params": {
                    "new_group": group_id,
                    "fieldToUpdate": "groups_ids"
                }
            }
        };
    },

    updatePinWithPinboard: function (pinboard_label, pinboard_id) {
        return {
            "query": {
                "term": {
                    "pinboard_id": pinboard_id
                }
            },
            "script": {
                "file": "updateField",
                "params": {
                    "fieldToUpdate": "pinboard_label",
                    "fieldValue": pinboard_label
                }
            }
        };
    },

    updatePinWithLayout: function (layout_label, layout_id) {
        return{
            "query": {
                "term": {
                    "layout_id": layout_id
                }
            },
            "script": {
                "file": "updateField",
                "params": {
                    "fieldToUpdate": "layout_label",
                    "fieldValue": layout_label
                }
            }
        };
    },


    //Function which returns the JSON to index pins
    createPinBulk: function (rows) {
        var myJson = [];

        for (let row in rows) {
                    if (rows.hasOwnProperty(row)) {
                        let element = rows[row];
                        myJson.push({ "create" : { "_index" : "opus", "_type" : "pin", "_id" : element.log_data_id } } ,this.createPin(element, element.group_ids));
                    }
                }
    
        return myJson;
    },

};

module.exports = elasticIndexBuilder;

