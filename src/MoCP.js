/**
 * Copyright (C) 2013 momomo.com <opensource@momomo.com>
 *
 * Licensed under the GNU LESSER GENERAL PUBLIC LICENSE, Version 3, 29 June 2007;
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.gnu.org/licenses/lgpl-3.0.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @Author Mohamed Seifeddine
 * @Author Philip Nilsson
 */
(function () {
        window.define ? define([], callback) : callback();

        function callback() {
                var MoJS = window.MoJS || (window.MoJS = {});
                MoJS.MoCP || (MoJS.MoCP = new MoCP());
                return MoCP;
        }

        function MoCP() {
                var that           = this;
                that.isMoCP        = true;
                that.library       = "MoCP";

                var cacheTaglibs   = that.taglibs = {};
                var cacheTextfiles = {};
                var cacheGlobal    = that.globals = {};

                that.render        = that.renderFile = renderFile;
                that.renderText    = renderText   ;
                that.renderPartial = renderPartial;
                that.sync          = sync         ;
                that.listen        = listen       ;
                that.scan          = scan         ;

                var optionsGlobal  = that.options = {
                        isProduction : false,

                        path : {
                                app : {
                                        root : "App/"
                                },

                                plugin : {

                                        // The plugin path for MoCP will be passed from MoQR if MoQR is used, otherwise will default to empty string to enable usage as normal app loading this source without plugin flag.
                                        // If intended to be used as a plugin then this should be set manually if not MoQR is used since without it is unknown what the path of this script is.
                                        // If set manually but using MoQR, this can be done through MoQR.options.path.plugins + library

                                        views : {
                                                root  : "ui/views/"
                                        },

                                        taglibs : {
                                                root  : "taglibs/",

                                                files : {
                                                        m : function() {
                                                                return that.library + "/" + optionsGlobal.path.plugin.taglibs.root + "MTaglib" + optionsGlobal.fileEnding; // A method because it uses the plugin option which can be altered after initialization
                                                        }
                                                }
                                        }

                                }
                        },

                        fileEnding   : require.isMoQR ? ".js" : '',
                        modelreuse   : false
                };

                var types = {
                        jsonp  : "jsonp"
                };

                var typesChar = "!";

                var syncKey = "MoCP.Sync";

                function sync(on) {
                        MoJS.MoEV.notify({key:syncKey, on:on});
                }

                function listen(on, fn) {
                        MoJS.MoEV.listen({key:syncKey, on:on}, fn);
                }

                function scan(elem) {
                        // TODO
                }

                // ======================================= Classes =========================================
                // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

                // -------------- View -----------------------------------------
                function $View(text, omodel, promise, viewParent) {
                        omodel || (omodel = {});

                        var model = viewParent && viewParent.model ?
                                optionsGlobal.modelreuse ?
                                        merge(viewParent.model, omodel)
                                        :
                                        merge(omodel, viewParent.model)
                                :
                                optionsGlobal.modelreuse ?
                                        omodel
                                        :
                                        merge({}, omodel);

                        var view = {
                                text          : text,
                                orginalModel  : omodel,

                                model         : model,

                                tagreturned   : undefined,
                                template      : undefined,
                                outArray      : [],
                                promise       : promise
                        };

                        /**
                         * 0. Think of everything as a view, the first template invocation, body invocations and so on
                         *
                         * 1. context or 'this' storage is always relative to the view. Store something on context or this,
                         *    and it won't exists outside that view, body, or subbodies, such as an <m:if call
                         *
                         * 2. model storage is relative to the executing view, body and all sub-bodies and nested render calls
                         *    Store something on a model and those changes will only be visible downwards, and not affect the parent views model
                         *    unless modelreuse is set to true. If false, then the model is remerged onto a fresh {}.
                         *    Ofcourse if you modify reference objects, those changes will affect both.
                         *
                         * 3. context.request or 'this'.request is an all spanning storage, where only one copy exist and shared
                         *    across templates and can be manipulated from sub templates.
                         *    Not thread safe, since this is an aysnchrounes library unless you preload files and such prior to a render call.
                         */
                        view.context = {
                                // !! === BE WARNED === !!
                                // EVERYTHING IN HERE SHOULD BE THREAD SAFE OR ON THE RESPONISBILITY OF THE DEVELOPER
                                // SUCH AS WITH view(). IT IS INCLUDED BUT REALLY HAS NO USE AS OF NOW,
                                // BUT WHO KNOWS IN THE FUTURE IF SOMEONE MIGHT NEED IT IN A TAGLIB TO DO SOME WICKED SHIT?
                                // !! ================= !!

                                model   : model,

                                request : model.request || (viewParent ? viewParent.context.request : {}),

                                render  : function(filepath, model) {
                                        return renderFile(filepath, model, view.promise);
                                },

                                renderText : function(text, model) {
                                        return renderText(text, model, view.promise);
                                },

                                renderPartial : function(text, model) {
                                        return renderPartial(text, model, view.promise);
                                },

                                asBody : function(text) {
                                        return viewAsBody(view, text);
                                },

                                lock : function() {
                                        return lockView(view);
                                },

                                unlock : function() {
                                        return unlockView (view);
                                },

                                view : view,
                                MoCP : that,  // In case there exists several MoCP instances

                                // ==== Extra functions that we might make use of in taglibs ===
                                util : {
                                        merge    : merge
                                }
                        };
                        if (model.request) {
                            delete model.request;
                        }

                        return promise.view = view;
                }
                /** ======== Following methods are instead defined once for optimization purposes only, although minor really ======== **/

                function viewOut(view, o) {
                        view.outArray.push(o);
                }
                function viewOutReplaces(view, starts, ends) {
                        viewOut(view, []);
                        var index = view.outArray.length-1;
                        function out(o) {
                                view.outArray[index].push(o);
                        }
                        out.replaces = function (){
                                return view.text.substring(starts, ends);
                        };

                        return out;
                }
                function viewAsBody(view, text) {
                        body.isBody  = true;
                        body.text    = text;

                        function body(model) {
                                return renderText(text, model, view.promise);
                        }
                        return body;
                }

                function viewPromiseLock(view) {
                        view.promise.lock++;
                }

                function viewPromiseUnlock(view) {
                        view.promise.lock--;

                        if ( view.promise.lock == 0 && !view.promise.isResolved ) {
                                view.promise.resolve( viewTemplateGetOrCreate(view), view.model );
                        }
                }
                function viewTemplateGetOrCreate(view) {
                        if ( !view.template ) {
                            view.template = viewTemplateCreate(view);
                        }

                        return view.template;
                }

                function viewTemplateCreate(view) {
                        var sb = [];  // "StringBuilder"
                        for ( var i = 0; i < view.outArray.length; i++ ) {
                                var o = view.outArray[i];
                                if ( isValid(o) ) {
                                        if ( o.splice ) {
                                                for ( var j = 0; j < o.length ; j++ ) {
                                                        viewTemplateObjectCreate(view, o[j], sb);
                                                }
                                        }
                                        else {
                                                viewTemplateObjectCreate(view, o, sb);
                                        }
                                }

                        }

                        return sb.join("");
                }

                function viewTemplateObjectCreate(view, o, sb) {
                        if ( isValid(o) ) {
                                if ( o.isPromise && o.view ) {
                                        sb.push( viewTemplateGetOrCreate(o.view) );
                                }
                                else {
                                        sb.push(o);
                                }
                        }
                }


                // -------------- Tag -----------------------------------------


                function $Tag(taglibName, methodName, attr, body, starts, ends) {
                        return {
                                taglibName : taglibName,
                                methodName : methodName,
                                attr       : attr,
                                body       : body,

                                starts     : starts,
                                ends       : ends
                        };
                }
                function taglibFinalPath(tag) {
                        return getAbsoluteTaglib(tag.taglibName);
                }
                function tagligMethodName(tag) {
                        return tag.methodName;
                }



                // -------------- Dollar -----------------------------------------

                function $Dollar(code, view){
                        return {
                                isDollar : true,

                                evaluate : function() {
                                        var val = evalsafeContextedReturns.call(view.context, code, view.model);

                                        if ( isValid(val) )
                                                return val;
                                        else
                                                return "";
                                }
                        };
                }

                // -----------------------------------------------------------------------------------------
                // =========================================================================================




                // =================================== Entry point methods =================================
                // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

                function renderText(text, model, promise) {
                        var o = lockViewPromiseCreate(promise);

                        return renderTextOptions(text, model, o);
                }

                function renderFile(file, model, promise) {
                        var o = lockViewPromiseCreate(promise);

                        // If comes in with a jsonp!http://myurl.com, strip out and re add after pluginFolder
                        var jsonp = false;
                        if ( startsWith(file, types.jsonp + typesChar) ) {
                                file  = file.substring( types.jsonp.length + typesChar.length );
                                jsonp = true;
                        }

                        file = pluginFile(optionsGlobal.path.plugin.views.root, file).file;

                        jsonp && (file = types.jsonp + typesChar + file);

                        var text = cacheTextfiles[file];
                        if ( text ) {
                                renderTextOptions(text, model, o);
                        } else {
                                requireDynamic(["text!" + file], function(text) {
                                        jsonp && text && ( text = text.toString() );

                                        cacheTextfiles[file] = text;

                                        renderTextOptions(text, model, o);
                                }, optionsMoQR);
                        }

                        return o.promise;
                }

                function renderPartial(key, model, promise) {
                        var body = cacheGlobal[key];

                        if ( body ) {
                                lockViewPromiseCreate(promise, false);

                                return body(model);
                        }
                }

                function renderTextOptions(text, model, o) {
                        return renderTextBase(text, model, o.promise, o.viewParent);
                }

                function lockViewPromiseCreate(promise, create) {
                        var o = {};

                        if (promise) {
                                if (promise.view) {
                                        o.viewParent = promise.view;

                                        lockView(o.viewParent);

                                        promise = $Promise().last(function() {
                                                unlockView(o.viewParent);
                                        });
                                }
                        } else if (create != false) {
                                promise = $Promise();
                        }

                        o.promise = promise;

                        return o;
                }

                /**
                 * MOST IMPORTANT METHOD, PERFORMS AND DELEGATES ACTIONS
                 *
                 * RULES: viewOut is to be used only here! No other place. This is to ensure maintenability, so respect it!
                 */
                function renderTextBase(text, model, promise, viewParent) {
                        var view = $View(text, model, promise, viewParent);

                        viewPromiseLock(view);

                        var i = 0;
                        while ( i < text.length ) {
                                var iChar = text.charAt(i);

                                var tmp = textTaglibMaybe(text, i);
                                if ( isValid(tmp) ) {

                                        // r is on ':', ie: <taglibName:
                                        var taglibName = textTaglibNameParseOut(text, i+1, tmp);
                                        tmp += taglibName.length;

                                        // :methodName
                                        var methodName = textMethodNameParseOut(text, tmp);
                                        tmp += methodName.length;

                                        var tag = textParseOutAttrsAndBody(text, tmp, view, i, taglibName, methodName);
                                        viewLoadTaglib(view, viewOutReplaces(view, tag.starts, tag.ends), tag );

                                        i  = tag.ends;
                                }

                                else if ( textInlineCodeOrCommentMaybe(text, i) ) {
                                        // On beginning of "<%" or "<%--"

                                        if ( textInlineCommentMaybe(text, i+2) ) {
                                                i = textInlineCommentEndIndex(text, i);
                                        }
                                        else {
                                                // Must be inline code then
                                                tmp = textInlineCodeParseOut(text, i);

                                                var o = {
                                                        out : viewOutReplaces(view, i, tmp.i)
                                                };

                                                if ( tmp.out ) {
                                                        var returns = evalsafeContextedReturns.call(view.context, tmp.code, view.model, o);
                                                        if ( returns ) { viewOut(view, returns); }
                                                } else {
                                                        evalsafeContexted.call(view.context, tmp.code, tmp.code, view.model, o);
                                                }

                                                i  = tmp.i;
                                        }
                                }

                                else if ( textDollarMaybe(text, i) ) {
                                        tmp = textDollarParseOut(text, i, view);
                                        viewOut(view, tmp.dollar.evaluate() );

                                        i = tmp.i + 1;
                                }
                                else {
                                        viewOut(view, iChar);

                                        i++;
                                }

                        }

                        // Unlock
                        viewPromiseUnlock(view);

                        return view.promise;
                }

                function lockView(viewParent) {
                        viewPromiseLock(viewParent);
                }
                function unlockView(viewParent) {
                        viewPromiseUnlock(viewParent);
                }

                // -----------------------------------------------------------------------------------------
                // =========================================================================================
























                function newTaglibInstanceToCache(key, taglibClass) {
                        return cacheTaglibs[ key ] || ( cacheTaglibs[ key ] = new taglibClass() );
                }

                function viewLoadTaglib(view, out, tag) {
                        var taglibInstance = cacheTaglibs[tag.taglibName];
                        var taglibPath     = taglibFinalPath(tag);

                        viewPromiseLock(view);

                        if ( taglibInstance ) {
                                taglibMethodInvoke(view, tag, taglibInstance, out);
                                viewPromiseUnlock(view);
                        } else {

                                requireDynamic([taglibPath], function (taglibClass) {
                                        taglibInstance = newTaglibInstanceToCache(tag.taglibName, taglibClass);
                                        taglibMethodInvoke(view, tag, taglibInstance, out);
                                        viewPromiseUnlock(view);
                                }, optionsMoQR);

                        }
                }
                function taglibMethodInvoke(view, tag, taglibInstance, out) {
                        if ( tag.body ) {
                                taglibMethodInvokeNextStep(taglibInstance, tag, viewAsBody(view, tag.body), view, out);

                        } else {
                                taglibMethodInvokeNextStep(taglibInstance, tag, undefined, view, out);
                        }
                }

                function taglibMethodInvokeNextStep(taglibInstance, tag, body, view, out) {
                        var methodName = tagligMethodName(tag);
                        var method     = taglibInstance[methodName];
                        if ( !method ) {
                                textExceptionThrow(
                                        view.text,
                                        tag.starts,
                                        str("The taglib method '", methodName, "' does not exists in '", taglibFinalPath(tag), "'")
                                );
                        }

                        view.tagreturned = method.call(view.context,
                                out,
                                tag.attr,
                                body,
                                view.tagreturned
                        );
                }

                // -----------------------------------------------------------------------------------------
                // =========================================================================================



















                // =================================== Text operations =====================================
                // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                /**
                 * <m:abc ...
                 * Returns text index for :
                 * Make recursive instead to avoid the for loop
                 */
                function textTaglibMaybe(text, i) {
                        if ( c(text, i) == '<' && text.length > ++i && isValidPropertyCharacterFirst(c(text, i)) ) {

                                // Now we look for : as in <m: for the taglibName
                                for ( ++i ; i < text.length ; i++ ) {
                                        if ( c(text, i) == ':' )
                                                return i;
                                        else if ( !isValidPropertyCharacterOther( c(text, i) ) )
                                                return undefined; // If not a valid character we abort
                                }

                        }

                        return undefined;
                }

                /**
                 *  <iToK:
                 */
                function textTaglibNameParseOut(text, i, k) {
                        return text.substring(i, k);
                }

                /**
                 *  <taglibName:methodName
                 */
                function textMethodNameParseOut(text, i) {
                        if ( isValidPropertyCharacterFirst( c(text, i) ) ) {
                                for ( var j = i+1 ; j < text.length ; j++ ) {
                                        if ( !isValidPropertyCharacterOther ( c(text, j) ) ) {
                                                return text.substring(i, j);
                                        }
                                }
                        }

                        return undefined;
                }

                function textInlineCodeOrCommentMaybe(text, i) {
                        return text.length > i + 3 && c(text, i) == '<' && c(text, i+1) == '%'; // Take account for two more chars at least
                }

                /**
                 * Must be performed after textInlineCodeOrCommentMaybe()
                 */
                function textInlineCommentMaybe(text, i) {
                        return text.length > i + 5 && c(text, i) == '-' && c(text, i+1) == '-'; // Take account for closing as well in length ----%>
                }

                function textDollarMaybe(text, i) {
                        return text.length > i + 3 && c(text, i) == '$' && c(text, i+1) == '{'; // Take into account ending and content
                }

                /**
                 * We allow for {} objects within the dollar, ${{a:1, b:2}}
                 *
                 * i is at the $
                 */
                function textDollarParseEndIndex(text, i) {
                        var j = indexOfEndRecurse(text, "{", "}", i+2);
                        if ( !j ) {
                                textExceptionThrow(text, i, "The dollar statement '${' was not closed using '}'");
                        }
                        return j;
                }

                function textDollarParseOut(text, i, view) {
                        var j      = textDollarParseEndIndex(text, i);
                        var key    = text.substring(i+2, j).trim();  // i is at $ so we substring from the dots ${...
                        var dollar = $Dollar(key, view);

                        return { dollar:dollar, i:j };
                }

                /**
                 * Should be called from start of index of comment <%-- ... --%>
                 */
                function textInlineCommentEndIndex(text, i) {
                        var j = indexOfEndRecurse(text, "<%--", "--%>", i + 4);
                        if ( !j ) {
                                textExceptionThrow(text, i, "The inline comment statement '<%--' was not closed with a '--%>'")
                        }
                        return j + 4; // Returns start of index for comment
                }

                /**
                 * <% code %> or <%= code %>
                 */
                function textInlineCodeParseOut(text, i) {
                        var codeStarts = i+2;
                        var k          = codeStarts;
                        var out        = false;
                        var a          = undefined;
                        var b          = undefined;

                        if ( c(text, k) == "=" ) {
                                out = true;
                                codeStarts++;
                                k++;
                        }

                        for ( ; text.length > k + 1 ; k++ ) {
                                a = c(text, k);
                                b = c(text, k+1);

                                if ( a == "%" && b == ">" ) {
                                        return {
                                                i    : k + 2,
                                                out  : out,
                                                code : text.substring(codeStarts, k)  // Faster than collecting chars on our own
                                        };
                                }
                        }

                        // Throw exception if ending was not found
                        textExceptionThrow(text, i, "The inline code statement '<%' was not closed with a '%>'");
                }

                /**
                 * Quite complex, but it is also because we look for $Dollar statments within the
                 * <tagName:methodName attr="${dollarValue}" and we allow for quotes, "greater than"(>) within the dollar,
                 * which makes it trickier to know when the actual attribute really closes, attr="${variable+"quote".length > 1}" />
                 *
                 * Is linear though, once all attributes have been collected and we find a >, we try to determine if its a
                 *
                 * simpleTag:
                 * <tagName:methodName attr="${dollarValue}"/> or a
                 *
                 * bodytag:
                 * <tagName:methodName attr="${dollarValue}">
                 *   body here
                 * </tagName:methodName>
                 *
                 * returns the position before the body starts
                 *
                 * @skipAttr is to know if something is a simple or body tag,
                 * without neccessarily evaluating or collection attributes along the ways.
                 * The dollars still have to be scanned to avoid identifiying length > 1 as a closing the attributes section "<m:tag ...attr... ((>))"
                 */
                function textParseOutAttrsAndInvokeSimpleOrBodyTagFunctions(text, i, view, fnSimpleTag, fnBodyTag, skipAttr) {
                        var attr = {};

                        var openedQuote = undefined;
                        var collect     = "";

                        var attrName = undefined;
                        var attrVal  = undefined;

                        var iChar;
                        for (; i < text.length ; i++) {
                                iChar = c(text, i);

                                if ( iChar == '"' || iChar == "'" ) {

                                        // Opening a quote, start collecting the value
                                        if ( !openedQuote ) {
                                                openedQuote = iChar;

                                                if ( !skipAttr ) {
                                                        // Everything up to the opening quote must be the attributeName
                                                        // except the '=' attrName="..."
                                                        attrName    = collect.substring(0, collect.length-1).trim();
                                                        collect     = "";         // Reset the collector
                                                        attrVal     = undefined;  // Reset the value
                                                }

                                                // Check for dollar, if dollar we skip all to the end of dollar
                                                if ( textDollarMaybe(text, i+1) ) {
                                                        var returns = textDollarParseOut(text, i+1, view);

                                                        if ( !skipAttr ) {
                                                                attrVal = returns.dollar.evaluate();
                                                        }

                                                        // Continue after the dollar, even if we ignore the attributes
                                                        i = returns.i;
                                                }

                                        }

                                        // Closing quote, the value has been collected
                                        else {
                                                if ( openedQuote == iChar ) {
                                                        openedQuote = undefined;

                                                        if ( !skipAttr ) {
                                                                if ( attrVal ) {
                                                                        attr[attrName] = attrVal;
                                                                        attrVal        = undefined;
                                                                } else {
                                                                        attr[attrName] = collect;
                                                                        collect = "";
                                                                }
                                                        }

                                                }
                                        }
                                }

                                // We are not collecting a value, then we must be collecting an attribute name.
                                // These characters are not allowed and reserved for other things
                                else if ( !openedQuote && ( iChar == ' ' || iChar =='/' || iChar == '>') ) {

                                        // Handle key attributes that lacks quotes and thereby a value
                                        // Example <m:js context/> or <m:js context /> or <m:js context > ... </m:js>
                                        if ( !skipAttr ) {
                                                attrName = collect.trim();
                                                if ( attrName ) {
                                                        attr[attrName] = undefined; // This is an attribute without any value, just a key
                                                        collect        = "";
                                                }
                                        }

                                        // Were we closing the tag?
                                        if ( iChar == '>' ) {

                                                // Simple tag. Look back one character, was the previous one a slash?
                                                if ( c(text, i-1)== "/" ) {
                                                        if ( fnSimpleTag ) {
                                                                return fnSimpleTag(i, attr);
                                                        }
                                                }
                                                else {
                                                        if ( fnBodyTag ) {
                                                                return fnBodyTag(i, attr);
                                                        }
                                                }

                                                break;
                                        }

                                }

                                else if ( !skipAttr ) {
                                        collect += iChar;
                                }
                        }

                        return undefined;
                }

                /**
                 * Starts after <taglibName:tagMethod
                 */
                function textParseOutAttrsAndBody(text, i, view, starts, taglibName, methodName) {
                        var startTag = "<"  + taglibName + ":" + methodName;         // Start tag should begin like this
                        var endTag   = "</" + taglibName + ":" + methodName + ">";   // End tag should look like this if a body tag

                        function fn(text, startTag, endTag, startIndex) {
                                return textParseOutAttrsAndInvokeSimpleOrBodyTagFunctions(text, startIndex + startTag.length, view,
                                        function(k, attr) {
                                                // Simple tag, example: <m:out/> meaning that this tag closes itself,
                                                // hence we have still to find the close tag for the orginial one

                                                return indexOfEndRecurse(text, startTag, endTag, k + 1, fn);
                                        },

                                        function(k, attr) {
                                                // Was not a simple tag, meaning that this opens another tag, so we have to find
                                                // the closing tag for this one first.
                                                var l = indexOfEndRecurse(text, startTag, endTag, k + 1, fn); // Good! Closing tag for the nested tag!
                                                //
                                                // Now, from l + endtag.lenght, find the next endTag recursively ( Might be nested )
                                                return indexOfEndRecurse(text, startTag, endTag, l + endTag.length, fn);
                                        },
                                        true
                                )
                        }

                        // First call made here.
                        // If body tag and indexOfEndRecurse finds another start tag within, then we recursivly look for our
                        // ending, passing the above function.
                        // The callback will on the found start tag within the body, figure out where it is closed in the same way.
                        // If that found start tag is a body tag, then we find that body end tag first, and then ours is returned.
                        return textParseOutAttrsAndInvokeSimpleOrBodyTagFunctions(text, i, view,
                                function(j, attr) {
                                        return $Tag(taglibName, methodName, attr, undefined, starts, j+1);
                                }, function(j, attr) {
                                        var endTagIndex = indexOfEndRecurse(text, startTag, endTag, j, fn);
                                        return $Tag(taglibName, methodName, attr, text.substring(j + 1, endTagIndex), starts, endTagIndex + endTag.length);
                                }
                        )
                }

                /**
                 * TODO In development mode, decorate the document body instead
                 */
                function textExceptionThrow(text, from, message) {
                        if ( !optionsGlobal.isProduction ) {

                                var line = exceptionHeader(that.library);

                                var startLine = text.lastIndexOf("\n", from) + 1;
                                var endLine   = text.indexOf("\n", from);
                                endLine = endLine > -1 ? endLine : text.length;

                                var row   = text.substring(startLine, endLine);
                                var rows  = text.split("\n");                       // Split each token, string to char array

                                // Find the rowIndex
                                for ( var rowIndex = 0; rowIndex < rows.length; rowIndex++ ) {
                                        if ( rows[rowIndex] == row ) {
                                                break;
                                        }
                                }

                                var tokenIndex  = from - startLine;                    // From start up to the token

                                rows.splice(rowIndex, 0, line);
                                rows.splice(rowIndex+2, 0, line);

                                throw str(
                                        "\n", line,
                                        "\nMoCP: Exception on (line, token) : (", rowIndex + 1, ", ", tokenIndex + 1,") \n",
                                        "Message:\n ", message,
                                        "\n", line,
                                        "\n\n",
                                        rows.join("\n")
                                );
                        }

                }

                function getAbsoluteTaglib(taglibName) {
                        var file = optionsGlobal.path.plugin.taglibs.files[taglibName];
                        if ( file ) {
                                if (  isFunction(file) ) {
                                        file = file();    // Invoke, should return name with .js
                                }
                        }
                        else {
                                file = pluginFile( optionsGlobal.path.plugin.taglibs.root, upperCaseFirstLetter(taglibName) + "Taglib.js").file;
                        }

                        return file;
                }

                // -----------------------------------------------------------------------------------------
                // =========================================================================================






                // ======================================= MoXY ============================================
                // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


                function merge(a, b) {
                        if ( a ) {
                                for ( var property in b ) {
                                        if ( !hasOwnProperty.call(a, property) ) {
                                                a[property] = b[property];
                                        }
                                }
                        } else {
                                return merge({}, b);
                        }

                        return a;
                }

                /**
                 * Will look for the ending. Needs to start after the first start!
                 * TODO Consider creating a version that is a copy of this but optimized for
                 * textParseOutAttrsAndBody(...) although that would really suck ( reduncancy hurts my feelings )
                 * but it might boost power even more in the Javascript world, although not likely to matter much
                 */
                function indexOfEndRecurse(text, start, end, from, fn) {
                        var r = indexOf(text, [start, end], from, text.length);

                        if ( r ) {
                                if ( r.word == start ) {

                                        if ( fn ) {
                                                return fn(text, start, end, r.i);    // We handle it manually here
                                        }
                                        else {
                                                // Index for the closing tag of this opening tag
                                                r = indexOfEndRecurse(text, start, end, r.i + start.length); // Must be the end one

                                                // Now, from k, find the next one recursively
                                                return indexOfEndRecurse(text, start, end, r + end.length);
                                        }

                                } else {
                                        // Everything is in order
                                        return r.i;
                                }
                        }

                        return undefined;
                }

                var hasOwnProperty = Object.prototype.hasOwnProperty;  // If somebody adds a property hasOwnProperty to our object we call the prototype one instead

                /**
                 * Create a String from the parameters instead of plus concatinating
                 */
                function str() {
                        return Array.prototype.join.call(arguments, "");
                }

                function xChars(i, iChar) {
                        var chars = "";
                        for ( ;i--; )  chars += iChar;
                        return chars;
                }

                function exceptionHeader(library) {
                        var lineArray = xChars(30, '=').split("");
                        lineArray.splice(parseInt(lineArray.length - 1) / 2 + 1, 0, " " + library + " Exception! "); // Push in the word ERROR in the middle
                        return lineArray.join("");
                }

                function loadText(path, fn, errorfn, options) {
                        options || ( options = {} );

                        var file = new XMLHttpRequest();
                        file.onreadystatechange = function () {
                                if (file.readyState === 4) {
                                        file.onreadystatechange = null;

                                        // Status zero
                                        if (file.status === 200 || file.status === 0 ) {
                                                fn(file, file.responseText);
                                        }
                                }
                        };

                        file.onerror = function(file) {
                                errorfn && errorfn(file);
                        };

                        file.open("GET", path, options.async != false );   // Defaults to true
                        file.send(null);
                }

                /**
                 * Searches only up to an index, wereas the normal indexOf will look through entire text.
                 * Also, will search for several things at the same time, will looping through the text, returning the first matching one and its index
                 *
                 * TODO Improve performance
                 */
                function indexOf(text, words, from, to) {
                        if ( words.substring ) words = [words];

                        for ( ;from < text.length && from < to ; from++ ) {
                                for ( var j = 0; j < words.length ; j++ ) {
                                        if ( words[j].length <= to && matchesWord(text, words[j], from) ) {
                                                return { word: words[j], i: from, j:j };
                                        }
                                }
                        }

                        return undefined;
                }

                /**
                 * TODO Improve performance
                 */
                function matchesWord(text, word, from) {
                        // This if block is just to a quick check for the first character to avoid the while loop initializiation
                        if ( c(text, from) == c(word, 0) ) {

                                for(var j = 1; j < word.length && (from + j) < text.length; j++) {
                                        if ( c(text, from+j) != c(word, j) ) {
                                                return false;
                                        }
                                }

                                return true;
                        }

                        return false;
                }

                function isValid(o) {
                        return !(o == undefined || o == null);
                }

                function isValidPropertyCharacterFirst(jChar) {
                        return jChar >= 'a' && jChar <= 'z' ||
                                jChar >= 'A' && jChar <= 'Z' ||
                                jChar == '$' || jChar == '_';
                }
                function isValidPropertyCharacterOther(jChar) {
                        return isValidPropertyCharacterFirst(jChar) ||
                                jChar >= '0' && jChar <= '9'; // We also allow numbers on 2->n
                }

                function isFunction(o) {
                        return typeof(o) == "function";
                }

                function isString(o) {
                        return o.substring;
                }

                function $Promise() {
                        var stack = [];
                        var lastfn = undefined;
                        var args = undefined;

                        var that = {
                                isPromise : true,

                                lock: 0,

                                done: function (fn) {
                                        if (args != undefined) {
                                                call(fn);
                                        } else {
                                                stack.push(fn);
                                        }

                                        return that;
                                },

                                last: function (fn) {
                                        if (lastfn != undefined) {
                                                throw "There can only be one last!";
                                        } else if (args != undefined) {
                                                call(fn);
                                        } else {
                                                lastfn = fn;
                                        }

                                        return that;
                                },

                                resolve: function () {
                                        if (stack != null) {
                                                that.isResolved = true;

                                                args = arguments;

                                                if (lastfn) {
                                                        stack.push(lastfn);
                                                }

                                                for (var i = 0; i < stack.length; i++) {
                                                        call(stack[i]);
                                                }
                                        }

                                        lastfn = null;
                                        stack  = null;

                                        return that;
                                },

                                isResolved: false
                        };

                        function call(fn) {
                                fn.apply(that, args);
                        }

                        return that;
                }

                var optionsMoQR    = { args:true };
                var requireDynamic = window.MoJS && window.MoJS.MoQR ? requireMoQR : requireAMD;
                function requireMoQR(dependencies, fn, options) {
                        require.apply(require, arguments);
                }
                function requireAMD(dependencies, fn, options) {
                        Array.prototype.pop.call(arguments);  // Remove options argument, require cannot handle it
                        require.apply(require, arguments);
                }

                var pluginLeft = "$", pluginRight = "$";
                function pluginSplit(str) {
                        if ( str && startsWith(str, pluginLeft) ) {
                                var i = str.indexOf( pluginRight, pluginLeft.length );
                                if ( ~i ) {
                                        return {
                                                plugin : str.substring ( pluginLeft.length, i ),
                                                file   : str.substring ( i+pluginRight.length )
                                        };
                                }
                        }
                        return {file: str};
                }

                function pluginFile(folder, file, fn) {
                        folder || (folder = "");

                        var split = pluginSplit(file);
                        fn && fn(split);
                        if ( !isAbsolutePath(split.file) ){
                                split.file = folder + split.file;

                                if ( !split.plugin ) {
                                        split.plugin = unslash(optionsGlobal.path.app.root);
                                }
                        }

                        split.file = split.plugin + "/" + split.file;

                        return split;
                }

                function isAbsolutePath(path) {
                        if ( !isAbsolutePath.regexp ) {
                                isAbsolutePath.regexp = new RegExp("^(?:/|.*://)");
                        }

                        return isAbsolutePath.regexp.test(path);
                }

                function upperCaseFirstLetter(name) {
                        return name.substring(0, 1).toUpperCase() + name.substring(1);
                }

                function unslash(str) {
                        if ( endsWith(str, "/")  ) {
                                return unslash( str.substring(0, str.length-1) );
                        }
                        return str;
                }

                function endsWith(str, s) {
                        return str.indexOf(s, str.length - s.length) !== -1;
                }

                function startsWith(str, s) {
                        return str.lastIndexOf(s, 0) === 0;
                }
                function c(text, i) {
                        return text.charAt(i);
                }

                // =========================================================================================
        }













        // ======================================= OUT OF SCOPE ====================================
        // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

        /**
         * !!!NOTE!!!
         * This piece of code must remain outside any logic, which will leave eval exposed only to the window object
         *
         * Consider optimizing the with(..) calls
         * See http://jsperf.com/withstatement
         * This approach is the fastest!
         */
        function evalsafe(_codeOriginal_, _code_, _context0_, _context1_, _context2_) {
                try {
                        with(_context2_ || {}) {
                                with(window) {
                                        with (_context1_ || {}) {
                                                with(_context0_ || {}) {
                                                        return eval("(function(){ "+ _code_ +";}).call(this)");  // this allows us to keep the invokers this
                                                }
                                        }
                                }
                        }
                } catch(e) {
                        throw "\n\nError occured when evaluating:\n" + _codeOriginal_ + "\n\nError message:\n" + e;
                }
        }

        function evalsafeContexted(_codeOriginal_, _code_, _context0_, _context1_) {
                return evalsafe.call(this, _codeOriginal_, _code_, _context0_, _context1_, evalContext(_code_));
        }

        // Not all code can be executed safely with a return infront, ie: "if ( true ) console.log(123);" so this is requested when it is
        // a requirement
        function evalsafeContextedReturns(_codeOriginal_, _context0_, _context1_) {
                return evalsafeContexted.call(this, _codeOriginal_, "return "+ _codeOriginal_ +";", _context0_, _context1_);
        }


        /**
         * For eval purposes, since otherwise an undefined varible will throw an UNCATCHABLE exception in eval
         * We need to allow for undefined variables, which will output empty strings in dollars and possibly inline code
         */
        function evalContext(_code) {
                var _scope = {};
                var matches = _code.match(/[A-Za-z_$][\w$]*/g);
                for(var i = 0; matches && i < matches.length; i++) {
                        _scope[matches[i]] = undefined;
                }
                return _scope;
        }
})();














