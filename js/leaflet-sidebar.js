/* global L */

/**
 * @name Sidebar
 * @class L.Control.Sidebar
 * @extends L.Control
 * @param {string} id - The id of the sidebar element (without the # character)
 * @param {Object} [options] - Optional options object
 * @param {string} [options.position=left] - Position of the sidebar: 'left' or 'right'
 * @see L.control.sidebar
 */
L.Control.Sidebar = L.Control.extend(/** @lends L.Control.Sidebar.prototype */ {
    includes: (L.Evented.prototype || L.Mixin.Events),

    options: {
        position: 'left'
    },

    initialize: function (id, options) {
        L.setOptions(this, options);

        // Find sidebar HTMLElement
        this._sidebar = L.DomUtil.get(id);

        // Attach .sidebar-left/right class
        L.DomUtil.addClass(this._sidebar, 'sidebar-' + this.options.position);

        // Attach touch styling if necessary
        if (L.Browser.touch)
            L.DomUtil.addClass(this._sidebar, 'leaflet-touch');

        // Find sidebar > div.sidebar-content
        for (let i = this._sidebar.children.length - 1; i >= 0; i--) {
            const child = this._sidebar.children[i];
            if (child.tagName == 'DIV' &&
                L.DomUtil.hasClass(child, 'sidebar-content'))
                this._container = child;
        }

        // Find sidebar ul.sidebar-tabs > li, sidebar .sidebar-tabs > ul > li
        this._tabitems = this._sidebar.querySelectorAll('ul.sidebar-tabs > li, .sidebar-tabs > ul > li');
        for (let i = this._tabitems.length - 1; i >= 0; i--) {
            this._tabitems[i]._sidebar = this;
        }

        // Find sidebar > div.sidebar-content > div.sidebar-pane
        this._panes = [];
        this._closeButtons = [];
        for (let i = this._container.children.length - 1; i >= 0; i--) {
            const child = this._container.children[i];
            if (child.tagName == 'DIV' &&
                L.DomUtil.hasClass(child, 'sidebar-pane')) {
                this._panes.push(child);

                const closeButtons = child.querySelectorAll('.sidebar-close');
                for (let j = 0, len = closeButtons.length; j < len; j++)
                    this._closeButtons.push(closeButtons[j]);
            }
        }
    },

    /**
     * Add this sidebar to the specified map.
     *
     * @param {L.Map} map
     * @returns {Sidebar}
     */
    addTo: function (map) {
        this._map = map;

        for (let i = this._tabitems.length - 1; i >= 0; i--) {
            const child = this._tabitems[i];
            const sub = child.querySelector('a');
            if (sub.hasAttribute('href') && sub.getAttribute('href').slice(0, 1) == '#') {
                L.DomEvent
                    .on(sub, 'click', L.DomEvent.preventDefault)
                    .on(sub, 'click', this._onClick, child);
            }
        }

        for (let i = this._closeButtons.length - 1; i >= 0; i--) {
            const child = this._closeButtons[i];
            L.DomEvent.on(child, 'click', this._onCloseClick, this);
        }

        return this;
    },

    /**
     * Remove this sidebar from the map.
     *
     * @returns {Sidebar}
     */
    remove: function () {
        this._map = null;

        for (let i = this._tabitems.length - 1; i >= 0; i--) {
            const child = this._tabitems[i];
            L.DomEvent.off(child.querySelector('a'), 'click', this._onClick);
        }

        for (let i = this._closeButtons.length - 1; i >= 0; i--) {
            const child = this._closeButtons[i];
            L.DomEvent.off(child, 'click', this._onCloseClick, this);
        }

        return this;
    },

    /**
     * Open sidebar (if necessary) and show the specified tab.
     *
     * @param {string} id - The id of the tab to show (without the # character)
     */
    open: function (id) {
        // hide old active contents and show new content
        for (let i = this._panes.length - 1; i >= 0; i--) {
            const child = this._panes[i];
            if (child.id == id) {
                L.DomUtil.addClass(child, 'active');
            } else if (L.DomUtil.hasClass(child, 'active')) {
                L.DomUtil.removeClass(child, 'active');
            }
        }

        // remove old active highlights and set new highlight
        for (let i = this._tabitems.length - 1; i >= 0; i--) {
            const child = this._tabitems[i];
            if (child.querySelector('a').hash == '#' + id) {
                L.DomUtil.addClass(child, 'active');
            } else if (L.DomUtil.hasClass(child, 'active')) {
                L.DomUtil.removeClass(child, 'active');
            }
        }

        this.fire('content', { id: id });

        // open sidebar (if necessary)
        if (L.DomUtil.hasClass(this._sidebar, 'collapsed')) {
            this.fire('opening');
            L.DomUtil.removeClass(this._sidebar, 'collapsed');
        }

        return this;
    },

    /**
     * Close the sidebar (if necessary).
     */
    close: function () {
        // remove old active highlights
        for (let i = this._tabitems.length - 1; i >= 0; i--) {
            const child = this._tabitems[i];
            if (L.DomUtil.hasClass(child, 'active'))
                L.DomUtil.removeClass(child, 'active');
        }

        // close sidebar
        if (!L.DomUtil.hasClass(this._sidebar, 'collapsed')) {
            this.fire('closing');
            L.DomUtil.addClass(this._sidebar, 'collapsed');
        }

        return this;
    },

    /**
     * @private
     */
    _onClick: function () {
        if (L.DomUtil.hasClass(this, 'active')) {
            this._sidebar.close();
        } else if (!L.DomUtil.hasClass(this, 'disabled')) {
            this._sidebar.open(this.querySelector('a').hash.slice(1));
        }
    },

    /**
     * @private
     */
    _onCloseClick: function () {
        this.close();
    }
});

/**
 * Creates a new sidebar.
 *
 * @example
 * const sidebar = L.control.sidebar('sidebar').addTo(map);
 *
 * @param {string} id - The id of the sidebar element (without the # character)
 * @param {Object} [options] - Optional options object
 * @param {string} [options.position=left] - Position of the sidebar: 'left' or 'right'
 * @returns {Sidebar} A new sidebar instance
 */
L.control.sidebar = function (id, options) {
    return new L.Control.Sidebar(id, options);
};
