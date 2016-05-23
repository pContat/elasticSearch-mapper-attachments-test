var mapping = {
    fileMapping: {
        "document": {
            "properties": {
                "attachment": {
                    "type": "attachment",
                    //Add index -1 pour tout indexer
                    "fields": {
                        "content": {
                            "type": "string",
                            "term_vector": "with_positions_offsets",
                            "store": true
                        },
                        //Metadata supported
                        "title": { "store": "yes" },
                        "date": {
                            //"store": "yes",
                            "type": "date",
                            "format": "dd/MM/yyyy"
                        },
                        "name": {
                            "store": "yes",
                            "index_analyzer": "simple"
                        },
                        //"author" : {"analyzer" : "myAnalyzer"},
                        "keywords": { "store": "yes" },
                        "content_type": { "store": "yes" },
                        "content_length": { "store": "yes" },
                        "language": { "store": "yes" }
                    }
                },
                ///Custum here
                "document_type": {
                    "type": "string"
                },
                "insertDate": {
                    //"store": "yes",
                    "type": "date",
                    "format": "dd/MM/yyyy"
                }
                //"id_document" versionID            
            }
        }
    }
}

module.exports = mapping