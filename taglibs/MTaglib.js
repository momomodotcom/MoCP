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
                MoJS.MTaglib || (MoJS.MTaglib = MTaglib);
                return MTaglib;
        }

        function MTaglib() {
                var that         = this;
                var
                        KEY      = 'key',
                        VAL      = 'val',
                        BODY     = 'body',
                        PARTIAL  = 'partial',
                        ID       = 'id',
                        CONTEXT  = 'context',
                        IN       = 'in',
                        IF       = 'if',
                        ELSE     = 'else',
                        ELSEIF   = 'elseif',
                        TEXT     = 'text';

                that.preload = function(){};

                /**
                 * <m:each key='' val='' in='' > ... </m:each>
                 */
                that.each = function (out, attr, body) {
                        var o = attr[IN];
                        if (o) {
                                var key = attr[KEY] || KEY;
                                var val = attr[VAL] || VAL;

                                var keyMoEV = MoJS && MoJS.MoEV ? MoJS.MoEV.options.key : undefined;
                                for (var k in o) {
                                        if ( k == keyMoEV || !o.hasOwnProperty(k) ) continue;

                                        attr[key] = k;
                                        attr[val] = o[k];
                                        out( body(attr) );
                                }
                        }
                };

                that[IF] = function (out, attr, body) {
                        if (attr.test) {
                                out(body());
                        } else {
                                return { previous: that[IF] };
                        }
                };

                that[ELSEIF] = function (out, attr, body, tr) {
                        if ( r0(tr) ) {
                                return that[IF].apply(this, arguments);
                        }
                };

                that[ELSE] = function (out, attr, body, tr) {
                        if ( r0(tr) ) {
                                out(body());
                        }
                };

                /**
                 * Redundancy avoidance method, name is not important
                 */
                function r0(tr) {
                        return tr && (tr.previous === that[IF] || tr.previous === that[ELSEIF]);
                }

                /**
                 * Will ignore parsing and just spit out the content
                 */
                that.esc = function (out, attr, body) {
                        out(body[TEXT]);
                };

                /**
                 *
                 * Small convenient out if
                 *
                 * <m:o t='${i%2}' i='even' e='odd' />
                 *
                 * t = test
                 * i = if true
                 * e = else
                 *
                 */
                that.o = function (out, attr, body) {
                        if (attr.t) {
                                if (attr.i) {
                                        out(attr.i);
                                }
                                else if (body) {
                                        out(body());
                                }
                        }
                        else if (attr.e) {
                                out(attr.e);
                        }
                };

                that.set = function (out, attr, body) {
                        if (attr[PARTIAL]) {
                                this.MoCP.globals[ attr[PARTIAL] ] = body;
                        }
                        else if (attr[KEY]) {
                                if (body) {
                                        this.model[ attr[KEY] ] = body
                                }
                                else {
                                        this.model[ attr[KEY] ] = attr[VAL];
                                }
                        } else {
                                throw "One of attributes '" + PARTIAL + "' or '" + KEY + "' must be used!"
                        }
                };

                that.get = function (out, attr, body, tr) {
                        return renderGetBase.call(this, out, attr, body, tr, that.get, getFn);
                };
                that.body = function (out, attr, body, tr) {
                        return renderGetBase.call(this, out, attr, body, tr, that.body, bodyFn);
                };

                that.render = function (out, attr, body, tr) {
                        return renderGetBase.call(this, out, attr, body, tr, that.render, renderFn);
                };

                that.link = function (out, attr, body, tr) {
                        out('#');
                        out(MoJS.MoVC.options.hashActivity);

                        if ( !attr.url && this.request ) {
                                if ( !attr.controller ) {
                                        attr.controller = this.request.controller;
                                }

                                if ( !attr.action ) {
                                        attr.action = this.request.action;
                                }
                        }

                        out( MoJS.MoVC.urlCreate.call(undefined, attr) );
                };

                /**
                 * Updates the body path
                 */
                that.movc = function (out, attr) {
                        for (var key in attr) {}            // If any key
                        key || (attr = this.request); // Can also be passed as controller='', action='' and plugin=''

                        if (attr) {
                                outScriptOpen(out, {mocp:"m:movc"});
                                outFnWrap(out, '' +
                                        'var body = document.getElementsByTagName("body")[0];' +
                                        'body.setAttribute("controller", "' + (attr.controller || '' ) + '");' +
                                        'body.setAttribute("action", "'     + (attr.action     || '' ) + '");' +
                                        'body.setAttribute("plugin", "'     + (attr.plugin     || '' ) + '");'
                                );
                                outScriptClose(out);
                        }
                };

                /*that.title = function (out, attr, body, tr) {
                        if (attr.val) {
                                outScriptOpen(out, {mocp:"m:title"});
                                outFnWrap (out, '' +
                                        'var title = document.getElementsByTagName("title")[0];' +
                                        'if ( !title ){' +
                                        'title = document.createElement("title");' +
                                        'document.getElementsByTagName("head")[0].appendChild(title);' +
                                        '}' +

                                        'title.innerHTML = "' + attr.val + '";'
                                );
                                outScriptClose(out);
                        }
                };*/

                that.id = function (out, attr, body) {
                        var val = this.model[ getKey(attr) || ID ] = random();
                        out(val);
                };

                that.js = function (out, attr, body, tr) {
                        var id = attr.id;
                        if ( !id ) {
                                id = getKey(attr);
                                if ( id ) {
                                        id = this.model[id];
                                }
                        }
                        if ( !id ){
                                id = random();
                        }

                        invokejs[id] = this; // Store aside this context

                        body().done(function(template) {
                                outScriptOpen(out, {id:id, mocp:"m:js"});
                                out('MoJS.MoCP.taglibs.m.js.invoke("'+id+'", function($element$, $id$) {'+template+'});');
                                outScriptClose(out);
                        });
                };

                that.js.invoke = invokejs;
                function invokejs(id, fn) {
                        var script  = document.getElementById(id);
                        if ( !script ) {
                                // Special for IE8!
                                setTimeout(function() {
                                        invokejs(id, fn);
                                });
                        }
                        else {
                                var $element$  = script.previousSibling;
                                if ( $element$ ) {
                                        if ( nodeCommentIs($element$) || nodeTextIs($element$) ) {
                                                $element$ = $element$.previousSibling;
                                        }
                                }

                                var originalcontext = invokejs[id];     // Might be null if that.js is not called prior
                                delete                invokejs[id];
                                fn.call(originalcontext, $element$, id);
                        }
                }

                that.sync = function (out, attr, body, tr) {
                        var id      = '' + random();
                        var comment = '<!--'+id+'-->';
                        out(comment);
                        out(body());
                        out(comment);

                        this.MoCP.listen(attr.on || attr.syncon, function () {
                                body().done(function (template) {

                                        var div = document.createElement('div');
                                        div.innerHTML = template;

                                        // Find our comment first
                                        var comment    = nodeCommentGetOrFind(document.documentElement, id);
                                        var parentNode = comment.parentNode;
                                        var sibling    = comment.nextSibling;

                                        // Delete all contents in between
                                        while (sibling) {
                                                if (nodeCommentContentMatch(sibling, id)) {
                                                        break;
                                                } else {
                                                        var tmp = sibling;
                                                        sibling = sibling.nextSibling;
                                                        parentNode.removeChild(tmp);
                                                }
                                        }

                                        // Now we append our elements
                                        var children = div.childNodes;
                                        var child;
                                        var i        = 0;
                                        while (i < children.length ) {
                                                nodeScriptReplace( children[i] );
                                                parentNode.insertBefore (children[i], sibling);

                                                // As the elements are transferred from the div, the length decreases automatically why we don't need to have:
                                                // i++
                                        }

                                });
                        });
                };

                /**
                 * This method replaces a script node inserted with innerHTML with an executable script node
                 *
                 * HTML5 specifies that a <script> tag inserted via innerHTML should not execute
                 * @See https://developer.mozilla.org/en-US/docs/Web/API/Element.innerHTML
                 */
                function nodeScriptReplace(node) {
                        if ( nodeScriptIs(node) ) {
                                node.parentNode.replaceChild( nodeScriptCopy(node), node);
                        }
                        else {
                                var j        = 0;
                                var children = node.childNodes;
                                while ( j < children.length) {
                                        nodeScriptReplace( children[j] );
                                        j++;
                                }
                        }
                }

                function nodeScriptCopy(node) {
                        var script  = document.createElement("script");
                        script.text = node.innerHTML;

                        for (var i = 0; i < node.attributes.length; i++) {
                                var attr = node.attributes[i];
                                if (attr.specified) {
                                        script.setAttribute(attr.name, attr.value);
                                }
                        }
                        return script;
                }

                function nodeScriptIs(node) {
                        return node.getAttribute && node.getAttribute("type") == "text/javascript";
                }
                function nodeCommentIs(node) {
                        return node.nodeType === 8;
                }
                function nodeTextIs(node) {
                        return node.nodeType === 3;
                }

                var cacheComment = {};
                function nodeCommentGetOrFind(node, commentContent) {
                        var child = cacheComment[commentContent];
                        if (child) {
                                return child;
                        }
                        else {
                                return nodeCommentFindRecurse(node, commentContent);
                        }
                }

                function nodeCommentFindRecurse(node, commentContent) {
                        var children = node.childNodes;

                        var child, returns;
                        for (var i = 0; i < children.length; i++) {
                                child = children[i];

                                if (nodeCommentContentMatch(child, commentContent)) {
                                        cacheComment[commentContent] = child;
                                        return child;
                                }
                                else if (child.hasChildNodes && child.childNodes) {
                                        returns = nodeCommentFindRecurse(child, commentContent);
                                        if (returns) return returns;
                                }
                        }
                }

                function nodeCommentContentMatch(node, commentContent) {
                        return nodeCommentIs(node) && node.nodeValue === commentContent;
                }

                function getFn(out, on) {
                        if (outGlobal.call(this, out, on) || outKey.call(this, out, on)) return;

                        throw "One of attributes '" + KEY + "' or '" + PARTIAL + "' must be used!"
                }

                function bodyFn(out, on) {
                        if (outKey.call(this, out, on)) return;

                        throw "One of attributes '" + KEY + "' must be used!"
                }

                function renderFn(out, on) {
                        if (outFile.call(this, out, on) || outText.call(this, out, on) || outGlobal.call(this, out, on)) return;

                        throw "One of attributes 'file', '" + PARTIAL + "' or 'text' must be used!";
                }

                function renderGetBase(out, attr, body, tr, callee, fn) {
                        var them = this;

                        if (tr && tr.previous === callee) {
                                var a = tr.attr;
                                a.model[ attr[BODY] || 'body' + tr.on ] = body;
                                tr.on++;

                                if (tr.attr.bodies == tr.on) {
                                        fn.call(them, out, tr.attr);
                                }
                                else {
                                        return tr;
                                }
                        }

                        else {
                                if (body) {
                                        attr.model = attr.model || {};
                                        attr.model [ attr[BODY] || 'body0' ] = body;
                                }

                                // If no body, or body is set, but we are not expecting any more bodies
                                if (!body || ( body && (!attr.bodies || attr.bodies == '1' ))) {
                                        fn.call(them, out, attr);
                                }

                                else {
                                        attr.bodies = parseInt(attr.bodies);
                                        return {previous: callee, attr: attr, on: 1 };
                                }
                        }

                        return null;
                }


                function outKey(out, on) {
                        if (on[KEY]) {
                                var val = this.model[ on[KEY] ];
                                if (val) {
                                        if (val.isBody) {
                                                outBody.call(this, out, on, val);
                                        }
                                        else {
                                                out(val);
                                        }


                                }
                                return true;
                        }
                }

                function outGlobal(out, on) {
                        if (on[PARTIAL]) {
                                var body = this.MoCP.globals[ on[PARTIAL] ];
                                out(body(on.model));
                                return true;
                        }
                }

                function outFile(out, on) {
                        if (on.file) {
                                out(this.render(on.file, on.model));
                                return true;
                        }
                }

                function outText(out, on) {
                        if (on.text) {
                                out(this.renderText(on.text, on.model));
                                return true;
                        }
                }

                /**
                 * context.model might be different from the body view.model
                 * and we therefor need to merge here as well.
                 * The reason is that a body can be stored aside, having access only to their parentViews model by default.
                 * When the body is invoked in a totally different parentView later on, being present in we need to make that parentViews model
                 * available to the body as well. So both views scopes are present in the body.
                 *
                 * You might also pass a model to the body on invokation which makes it three total.
                 * The attr model, the declared view model, and the executing views model
                 *
                 * The current executing scopes model of <m:body name='...'/> takes precendence over the declaring views as should
                 */
                function outBody(out, attr, body) {
                        if (body && body.isBody) {

                                // Merge the surronding invoker <m:body /> view's model
                                attr.model = this.util.merge(attr.model, this.model);

                                // We must lock the invoker as well, and wait for when the body actually resolves since the body only locks itself
                                this.lock();

                                // The <m:body /> will also get access to the declaring model in this invokation
                                var promise = body(attr.model);
                                out(promise);

                                promise.done(this.unlock)
                        }
                }

                var scriptOrder = 0;
                function outScriptOpen(out, o) {
                        out('<script type="text/javascript" ');
                        if ( o ) {
                                o.order || (o.order = scriptOrder++);

                                for ( var k in o ) {
                                        out(k + '="' + o[k] + '"');
                                }
                        }
                        return out(" >");
                }
                function outFnWrap(out, content) {
                        out("(function() {"+content+"})();")
                }
                function outScriptClose(out) {
                        return out('</script>');
                }

                function random() {
                        return Math.floor(Math.random() * 9007199254740992);
                }

                function getKey(attr, exclude) {
                        exclude = exclude || [];

                        for (var key in attr) {
                                var returns = true;

                                for (var i = 0; i < exclude.length; i++) {
                                        if ( key == exclude[i] ) {
                                                returns = false;
                                                break;
                                        }
                                        else {
                                                returns = true;
                                        }
                                }

                                // May not have a value
                                if (returns == true && attr[key] === undefined ) {
                                        return key;
                                }
                        }
                }

                function push(a, b) {
                        a.push.apply(a, b);
                        return a;
                }

                function isString(str) {
                        return str.substring;
                }
        }


})();