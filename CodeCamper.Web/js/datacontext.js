﻿// Depends on
//  Knockout
// 	toastr
//  app.dataservice
//  app.model
// ----------------------------------------------
app.datacontext = (function(ko, toastr, dataservice, model) {
    var
        itemsToArray = function (items, observableArray, filter, sortFunction) {
            if (!observableArray) return;
            observableArray([]) // clear the old observableArray
            var underlyingArray = []
            
            for (var prop in items) {
                if (items.hasOwnProperty(prop)) {
                    underlyingArray.push(items[prop]);
                    //observables.push(obj[prop]);
                }
            }
            if (filter) {
                var underlyingArray = _.filter(underlyingArray, function (o) {
                    match = filter.predicate(filter, o);
                    return match;
                })
            }
            toastr.info('Fetched, filtered and sorted ' + underlyingArray.length + ' records')
            underlyingArray.sort(sortFunction)
            observableArray(underlyingArray)
            observableArray.valueHasMutated()
        },
        mapToContext = function (dtoList, items, results, mapperFunction, filter, sortFunction, propName) {
            // Loop through the raw dto list and populate a dictionary of the items
            items = _.reduce(dtoList, function (memo, dto) {
                // If propName is passed, use it. Otherwise use id
                var id = propName ? dto[propName] : dto.Id;
                var existingItem = items[id];
                memo[id] = mapperFunction(dto, existingItem)
                return memo;
            }, {});
            itemsToArray(items, results, filter, sortFunction);
            toastr.success('received with ' + dtoList.length + ' elements');
            return items; // must return these
        },
        ContextList = function (getFunction, mapperFunction, nullo, propName) {
            var 
                items = {},
                add = function (newObj, keyName) {
                    // If keyName is passed, use it. Otherwise use id property
                    var id = keyName ? newObj[keyName] : newObj.id;
                    items[id] = newObj
                },
                removeById = function (id, keyName) {
                    // If keyName is passed, use it. Otherwise use id property
                    // Causes observables to be notified (ex: unmarking a favorite)
                    if(keyName) {
                        items[id][keyName](0)
                    }else {
                        items[id].id(0)
                    }
                    items[id] = app.model.attendanceNullo
                },
                getById = function (id) {
                    return !!id && !!items[id] ? items[id] : nullo;
                },
                getData = function (options) {
                //return $.Deferred(function (def) {
                    var results = options && options.results,
                        sortFunction = options && options.sortFunction,
                        filter = options && options.filter,
                        forceRefresh = options && options.forceRefresh,
                        param = options && options.param
                    if (!items || !app.utils.hasProperties(items) || forceRefresh) {
                        // TODO: deal with the filter
                        return $.Deferred(function (def) {
                            //getFunction.apply({}, params)
                            getFunction({
                                success: function (dtoList) {
                                    //TODO: create map object
                                    items = mapToContext(dtoList, items, results, mapperFunction, filter, sortFunction, propName);
                                    def.resolve(dtoList)
                                    },
                                    error: function () {
                                        toastr.error('oops! data could not be retrieved'); //TODO: get rid of this
                                        def.reject
                                    }
                                }, param)
                        }).promise();
                    }
                    else {
                        itemsToArray(items, results, filter, sortFunction);
                        //def.resolve(results)
                    }
                //}).promise();
                };
            return {
                add: add,
                getById: getById,
                getData: getData,
                removeById: removeById
            }
        },
        attendance = new ContextList(dataservice.attendance.getAttendance, model.mapper.mapAttendance, model.attendanceNullo, 'SessionId'),
        rooms = new ContextList(dataservice.lookup.getRooms, model.mapper.mapRoom, model.roomNullo),
        sessions = new ContextList(dataservice.session.getSessionBriefs, model.mapper.mapSession, model.sessionNullo);
        speakers = new ContextList(dataservice.person.getSpeakers, model.mapper.mapSpeaker, model.speakerNullo),
        timeslots = new ContextList(dataservice.lookup.getTimeslots, model.mapper.mapTimeSlot, model.timeSlotNullo),
        tracks = new ContextList(dataservice.lookup.getTracks, model.mapper.mapTrack, model.trackNullo),

        //TODO: handle persons
        persons = ko.observableArray()

    return {
        attendance: attendance,
        persons: persons,
        rooms: rooms,
        sessions: sessions,
        speakers: speakers,
        timeslots: timeslots,
        tracks: tracks
    }
})(ko, toastr, app.dataservice, app.model);