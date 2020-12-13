'use strict';

var GDFTimeDomainParser = function() {
    var mainBracket = null;
    var DEBUG = false;

    /* Polyfills */
    // https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(targetLength,padString) {
            targetLength = targetLength>>0; //truncate if number or convert non-number to 0;
            padString = String((typeof padString !== 'undefined' ? padString : ' '));
            if (this.length > targetLength) {
                return String(this);
            }
            else {
                targetLength = targetLength-this.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
                }
                return padString.slice(0,targetLength) + String(this);
            }
        };
    }

    var Bracket = function(isMainStructure) {
        this.startDataCache = null;
        this.durationDataCache = null;

        this.isMainStructure = !!isMainStructure;
        this.startDateTypes = [];
        this.durationDateTypes = [];

        var content = [];
        var parent = null;
        var chars = {
            start: '',
            duration: '',
        };

        function format2Dec(value) {
            return String(value).padStart(2, "0")
        }

        this.setParent = function(parentBracket) {
            parent = parentBracket;
        }
        this.add = function(bracket, join) {
            if(typeof join === 'undefined') join  = null;
            bracket.setParent(this);

            content.push({
                join: join,
                data: bracket,
            });
        }

        this.getParent = function() {
            return parent;
        }

        this.addChar = function(mode, char) {
            chars[mode] += char;
        }

        this.getStartDate = function() {
            var startData = this.getStartData();

            return new Date(
                (null !== startData.year ? startData.year : '1970') + '-' +
                (null !== startData.month ? format2Dec(startData.month) : '01') + '-' +
                (null !== startData.dayofmonth ? format2Dec(startData.dayofmonth) : '01') + ' ' +
                (null !== startData.hour ? format2Dec(startData.hour) : '00') + ':' +
                (null !== startData.minute ? format2Dec(startData.minute) : '00') + ':' +
                (null !== startData.second ? format2Dec(startData.second) : '01') + ' '
            );
        }

        this.haveSimpleText = function() {
            var startData = this.getStartData();
            var durationData = this.getDurationData();

            if(
                null !== startData.hour &&
                (null !== durationData.hour || null !== durationData.minute) &&
                !durationData.month && !durationData.dayofmonth
            ) {
                return true;
            }

            return false;
        }

        this.getSimpleText = function() {
            var startData = this.getStartData();
            var durationData = this.getDurationData();

            // 20:00 Uhr bis 24:00 Uhr
            if(
                null !== startData.hour &&
                (null !== durationData.hour || null !== durationData.minute) &&
                !durationData.month && !durationData.dayofmonth
            ) {
                var startDate = this.getStartDate();
                var interval = (durationData.hour * 3600 + durationData.minute * 60);
                var endDate = new Date(startDate.getTime() + interval * 1000);

                if(endDate.getHours() == 0 && endDate.getMinutes() == 0) {
                    endDate = new Date(endDate.getTime() - 60000);
                }

                return this.getStartString() + ' bis ' + format2Dec(endDate.getHours()) + ':' + format2Dec(endDate.getMinutes()) + " Uhr";
            }

            return '--ERROR--';
        }

        this.getSingleString = function() {

            if(this.haveSimpleText() === false) {
                var durationString = this.getDurationString();

                return this.getStartString() +
                    (
                        durationString != '' ? ' für ' + durationString : ''
                    );
            } else {
                return this.getSimpleText();
            }

        }

        this.getString = function(splitChar) {
            var texts = [];
            if(content.length > 0) {
                for (var bracketIndex in content) {
                    if(content.hasOwnProperty(bracketIndex)) {
                        var bracket = content[bracketIndex];

                        if (bracket.join == '*') {
                            texts.push('gilt nur');
                        } else if (bracket.join == '+') {
                            texts.push('gilt auch');
                        } else if (bracket.join == '-') {
                            texts.push('gilt nicht');
                        }

                        if (DEBUG) console.log('Bracket Ready: ' + bracket.data.getString(splitChar));
                        texts.push(bracket.data.getString('|##|'));

                        if (splitChar) texts.push('|##|');
                    }
                }

            } else {

                var singleString = this.getSingleString();

                texts.push(singleString);

            }

            if(splitChar && texts.length == 2 && texts[texts.length - 1] == splitChar) {
                texts.pop();
            }

            var result = texts.join(' ');

            if(this.isMainStructure === true) {
                result = result.replace(new RegExp('[|# ]+$', 'g'), '');
                result = result.replace(new RegExp('[|# ]{5,}', 'g'), '|##|');
            }

            result = result.replace(/\|\#\#\|/g, splitChar);

            return result;
        }

        var parseTimeDomain = function(timeDomain) {
            var parts = timeDomain.match(/([a-zA-Z]+[0-9]+)/g);

            var date = {
                year: null,
                month: null,
                week: null,
                dayofmonth: null,
                dayofweek: [],
                hour: null,
                minute: null,
                second: null
            };

            for(var pairIndex in parts) {
                if(parts.hasOwnProperty(pairIndex)) {
                    var pair = parts[pairIndex];
                    var singleParts = pair.match(/([a-zA-Z]+)([0-9]+)/);

                    var type = singleParts[1];
                    var value = singleParts[2];

                    switch (type) {
                        case 'y':
                            date.year = +value;
                            break;
                        case 'M':
                            date.month = +value;
                            break;
                        case 'w':
                            date.week = +value;
                            break;
                        case 'd':
                            date.dayofmonth = +value;
                            break;
                        case 't':
                            date.dayofweek.push(+value);
                            break;
                        case 'h':
                            date.hour = +value;
                            break;
                        case 'm':
                            date.minute = +value;
                            break;
                        case 's':
                            date.second = +value;
                            break;
                    }
                }
            }

            return date;
        }

        this.getStartData = function() {
            if(this.startDataCache === null) {
                this.startDataCache = parseTimeDomain(chars.start);

                for(var key in this.startDataCache) {
                    if(this.startDataCache[key] !== null) {
                        this.startDateTypes.push(key);
                    }
                }
            }

            return this.startDataCache;
        }

        this.getDurationData = function() {
            if(this.durationDataCache === null) {
                this.durationDataCache = parseTimeDomain(chars.duration);

                for(var key in this.durationDataCache) {
                    if(this.durationDataCache[key] !== null) {
                        this.durationDateTypes.push(key);
                    }
                }
            }

            return this.durationDataCache;
        }

        this.getStartString = function() {
            var date = this.getStartData();

            var text = [];

            if(null !== date.year && null !== date.month && null !== date.dayofmonth) {
                text.push('Ab ' + date.dayofmonth + '.' + format2Dec(date.month) + '.' + date.year);
            } else if(null !== date.year && null !== date.month) {
                text.push('Im ' + date.month + '. Monat im Jahr ' + date.year);
            } else if(null !== date.month && null !== date.dayofmonth) {
                text.push('am ' + date.dayofmonth + '.' + date.month + '.');
            } else if(null !== date.year && null !== date.dayofmonth) {
                text.push('Im Jahr ' + date.month + '.');
            }

            if(!date.month && null !== date.dayofmonth) {
                text.push('jeden ' + date.dayofmonth + '. Tag des Monats');
            }

            if(date.dayofweek.length > 0) {
                var days = [];
                for(var weekdayIndex in date.dayofweek) {
                    if(date.dayofweek.hasOwnProperty(weekdayIndex)) {
                        var weekday = date.dayofweek[weekdayIndex];

                        switch(+weekday) {
                            case 1: days.push('Sonntag'); break;
                            case 2: days.push('Montag'); break;
                            case 3: days.push('Dienstag'); break;
                            case 4: days.push('Mittwoch'); break;
                            case 5: days.push('Donnerstag'); break;
                            case 6: days.push('Freitag'); break;
                            case 7: days.push('Samstag'); break;
                            case 8: days.push('Feiertag'); break;
                        }
                    }
                }

                text.push('jeden ' + days.join(', '));
            }


            if(null !== date.hour && null !== date.minute && null !== date.second) {
                // Zeit ist HH:MM:SS
                text.push('' + format2Dec(date.hour) + ':' + format2Dec(date.minute) + ':' + format2Dec(date.second) + ' Uhr');
            } else if(null !== date.hour && null !== date.minute) {
                // Zeit ist HH:MM
                text.push('' + format2Dec(date.hour) + ':' + format2Dec(date.minute) + ' Uhr');
            } else if(null !== date.hour) {
                // Zeit ist HH:00
                text.push('' + format2Dec(date.hour) + ':00 Uhr');
            }

            return text.join(' ');
        }

        this.getDurationString = function() {
            var startDate = this.getStartData();
            var date = this.getDurationData();

            var text = [];
            if (null !== date.year) {
                text.push(date.year + ' Jahr' + (date.year > 1 ? 'n':''));
            }
            if (null !== date.month) {
                text.push(date.month + ' Monat' + (date.month > 1 ? 'n':''));
            }
            if (null !== date.week) {
                text.push(date.week + ' Woche' + (date.week > 1 ? 'n':''));
            }

            if(startDate.dayofweek.length > 0 ||
                (null !== startDate.dayofmonth && startDate.month) &&
                date.dayofmonth === 1 &&
                !date.month &&
                !date.year &&
                !date.week &&
                !date.hour) {
                // do not add "for 1 day"
                // when only day of month is set
                // when no extra hours are set
                // when x. day of week is set
                // month and day of month is set
            }

            if (date.dayofmonth !== null) {
                if(date.dayofmonth != 1 || date.week !== null || date.month !== null || date.hour !== null) {
                    text.push(date.dayofmonth + ' Tag' + (date.dayofmonth > 1 ? 'e':''));
                }

            }

            if (null !== date.hour) {
                if(date.minute === 30) {
                    date.hour += 0.5;
                    date.minute = null;
                }
                text.push(date.hour + ' Stunde' + (date.hour > 1 ? 'n':''));
            }
            if (null !== date.minute) {
                text.push(date.minute + ' Minute' + (date.minute > 1 ? 'n':''));
            }
            if (null !== date.second) {
                text.push(date.second + ' Sekunde' + (date.second > 1 ? 'n':''));
            }

            return text.join(', ');
        }
    }

    function parseTimeDomain( input ) {
        mainBracket = new Bracket(true);

        var currentBracket = mainBracket;
        var currentMode = '';
        var joinMode = '';
        if(DEBUG) console.log('start ' + input);

        for (var i = 0; i < input.length; i++) {
            var char = input[i];

            switch (char) {
                case '[':
                    var tmp = new Bracket(false);
                    currentBracket.add(tmp, joinMode);
                    currentBracket = tmp;
                    joinMode = '';
                    break;
                case ']':
                    if(DEBUG) console.log('finish');

                    currentBracket = currentBracket.getParent();
                    break;
                case '(':
                    currentMode = 'start';
                    break;
                case '{':
                    currentMode = 'duration';
                    break;
                case ')':
                case '}':
                    // do nothing
                    break;
                case '*':
                case '+':
                case '-':
                    joinMode = char;
                    break;
                default:
                    currentBracket.addChar(currentMode, char);
            }
        }

        if(DEBUG) console.log('close', mainBracket);
        return mainBracket;
    }

    this.getString = function(input, splitChar) {
        if(typeof splitChar === 'undefined') splitChar = ', ';
        var resultObj = parseTimeDomain(input);

        if(DEBUG) console.log(resultObj);

        var result = resultObj.getString(splitChar);
        return result[0].toUpperCase() + result.slice(1);
    };

    this.parse = function(input) {
        var resultObj = parseTimeDomain(input);
        if(DEBUG) console.log(resultObj);

        return resultObj;
    };

};

var windowObj = window || {}
windowObj.GDFTimeDomainParser = GDFTimeDomainParser;