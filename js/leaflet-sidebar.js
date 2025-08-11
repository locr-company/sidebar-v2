/**
 * Enhanced sidebar v2.1.0 with locrFINDER customizations
 */
L.Control.Sidebar = L.Control.extend({
    includes: L.Evented.prototype || L.Mixin.Events,

    options: {
        closeButton: true,
        position: 'left',
        autopan: false,
        customizable: true,
        theme: {
            mc1: '#2196F3',
            mc2: '#1976D2', 
            fc1: '#333333',
            fc2: '#666666',
            bc: '#FFFFFF',
            bc2: '#F5F5F5'
        },
        bottomPanel: {
            enabled: true,
            collapsible: true,
            height: '30%'
        },
        filterTabs: {
            enabled: true,
            tabs: ['All', 'Type A', 'Type B', 'Type C']
        },
        destinations: []
    },

    initialize: function (placeholder, options) {
        L.setOptions(this, options);
        
        this._sidebar = L.DomUtil.get(placeholder);
        if (!this._sidebar) {
            throw new Error('Could not find sidebar element with id: ' + placeholder);
        }

        this._tabs = {};
        this._panes = {};
        this._destinations = this.options.destinations || [];
        this._filteredDestinations = this._destinations.slice();
        this._activeFilter = 'All';
        this._bottomPanelExpanded = false;
        this._infoScreenActive = false;
        this._selectedDestination = null;

        this._setupCustomizations();
    },

    addTo: function (map) {
        this._map = map;
        
        this._initLayout();
        this._initEvents();
        
        map.on('click', this._onClick, this);
        map.fire('sidebar:loaded', { sidebar: this });
        
        return this;
    },

    removeFrom: function (map) {
        map.off('click', this._onClick, this);
        
        this._clearTimeout();
        
        if (this._sidebar.parentNode) {
            this._sidebar.parentNode.removeChild(this._sidebar);
        }

        if (this._autopanRestore) {
            this._autopanRestore();
            this._autopanRestore = null;
        }

        map.fire('sidebar:removed', { sidebar: this });
        
        return this;
    },

    open: function (id) {
        var tab = this._tabs[id];
        var pane = this._panes[id];
        
        if (!tab || !pane) return this;

        // Hide all panes and deactivate tabs
        for (var i in this._panes) {
            L.DomUtil.removeClass(this._panes[i], 'active');
        }
        for (var j in this._tabs) {
            L.DomUtil.removeClass(this._tabs[j], 'active');
        }

        // Show active pane and tab
        L.DomUtil.addClass(pane, 'active');
        L.DomUtil.addClass(tab, 'active');
        L.DomUtil.addClass(this._sidebar, 'collapsed');

        this._setupAutopan();
        
        this.fire('content', { id: id });
        return this;
    },

    close: function () {
        for (var id in this._tabs) {
            L.DomUtil.removeClass(this._tabs[id], 'active');
        }
        for (var id in this._panes) {
            L.DomUtil.removeClass(this._panes[id], 'active');
        }

        L.DomUtil.removeClass(this._sidebar, 'collapsed');

        if (this._autopanRestore) {
            this._autopanRestore();
            this._autopanRestore = null;
        }

        this.fire('closing');
        return this;
    },

    addTab: function (id, tab, pane, insertBefore) {
        var tabHref = tab.querySelector('a');
        if (tabHref) {
            tabHref.href = '#' + id;
        }

        pane.id = id;
        L.DomUtil.addClass(pane, 'sidebar-pane');

        if (insertBefore) {
            this._tabContainer.insertBefore(tab, insertBefore.nextSibling);
            this._paneContainer.insertBefore(pane, insertBefore.nextSibling);
        } else {
            this._tabContainer.appendChild(tab);
            this._paneContainer.appendChild(pane);
        }

        this._tabs[id] = tab;
        this._panes[id] = pane;

        L.DomEvent.on(tab.querySelector('a'), 'click', this._onTabClick, this);

        if (this.options.closeButton) {
            var closeButtons = pane.querySelectorAll('.sidebar-close');
            for (var i = 0, l = closeButtons.length; i < l; i++) {
                L.DomEvent.on(closeButtons[i], 'click', this._onCloseClick, this);
            }
        }

        return this;
    },

    removeTab: function (id) {
        var tab = this._tabs[id];
        var pane = this._panes[id];

        if (!tab || !pane) return this;

        var tabLink = tab.querySelector('a');
        if (tabLink) {
            L.DomEvent.off(tabLink, 'click', this._onTabClick, this);
        }

        if (this.options.closeButton) {
            var closeButtons = pane.querySelectorAll('.sidebar-close');
            for (var i = 0, l = closeButtons.length; i < l; i++) {
                L.DomEvent.off(closeButtons[i], 'click', this._onCloseClick, this);
            }
        }

        tab.parentNode.removeChild(tab);
        pane.parentNode.removeChild(pane);

        delete this._tabs[id];
        delete this._panes[id];

        return this;
    },

    // Enhanced methods for locrFINDER functionality
    setTheme: function (theme) {
        Object.assign(this.options.theme, theme);
        this._applyTheme();
        return this;
    },

    addDestination: function (destination) {
        this._destinations.push(destination);
        this._updateDestinationsList();
        return this;
    },

    removeDestination: function (index) {
        this._destinations.splice(index, 1);
        this._updateDestinationsList();
        return this;
    },

    setDestinations: function (destinations) {
        this._destinations = destinations;
        this._updateDestinationsList();
        return this;
    },

    filterDestinations: function (filter) {
        this._activeFilter = filter;
        if (filter === 'All') {
            this._filteredDestinations = this._destinations.slice();
        } else {
            this._filteredDestinations = this._destinations.filter(d => d.type === filter);
        }
        this._updateDestinationsList();
        return this;
    },

    toggleBottomPanel: function () {
        this._bottomPanelExpanded = !this._bottomPanelExpanded;
        this._updateBottomPanel();
        return this;
    },

    showDestinationInfo: function (destination) {
        this._selectedDestination = destination;
        this._showInfoScreen();
        return this;
    },

    hideDestinationInfo: function () {
        this._hideInfoScreen();
        return this;
    },

    _setupCustomizations: function () {
        if (this.options.customizable) {
            L.DomUtil.addClass(this._sidebar, 'sidebar-customizable');
        }
    },

    _initLayout: function () {
        L.DomUtil.addClass(this._sidebar, 'sidebar');
        
        if (this.options.position === 'right') {
            L.DomUtil.addClass(this._sidebar, 'sidebar-right');
        } else {
            L.DomUtil.addClass(this._sidebar, 'sidebar-left');
        }

        this._tabContainer = L.DomUtil.create('div', 'sidebar-tabs', this._sidebar);
        this._paneContainer = L.DomUtil.create('div', 'sidebar-content', this._sidebar);

        if (this.options.customizable) {
            this._createCustomElements();
        }

        this._applyTheme();
    },

    _createCustomElements: function () {
        // Filter tabs
        if (this.options.filterTabs.enabled) {
            this._filterContainer = L.DomUtil.create('div', 'sidebar-filters', this._tabContainer);
            this._createFilterTabs();
        }

        // Destinations list
        this._destinationsContainer = L.DomUtil.create('div', 'sidebar-destinations', this._paneContainer);
        this._updateDestinationsList();

        // Bottom panel
        if (this.options.bottomPanel.enabled) {
            this._createBottomPanel();
        }

        // Info screen
        this._createInfoScreen();
    },

    _createFilterTabs: function () {
        this.options.filterTabs.tabs.forEach((tabName, index) => {
            const tab = L.DomUtil.create('button', 'sidebar-filter-tab', this._filterContainer);
            tab.textContent = tabName;
            tab.dataset.filter = tabName;
            
            if (index === 0) {
                L.DomUtil.addClass(tab, 'active');
            }

            L.DomEvent.on(tab, 'click', (e) => {
                this._onFilterClick(e.target);
            }, this);
        });
    },

    _createBottomPanel: function () {
        this._bottomPanel = L.DomUtil.create('div', 'sidebar-bottom-panel', this._sidebar);
        
        // Collapsed state
        this._collapsedPanel = L.DomUtil.create('div', 'sidebar-panel-collapsed', this._bottomPanel);
        this._collapsedPanel.innerHTML = `
            <div class="sidebar-toggle-icon"></div>
            <span>Show Details</span>
        `;

        // Expanded state
        this._expandedPanel = L.DomUtil.create('div', 'sidebar-panel-expanded', this._bottomPanel);
        this._expandedPanel.innerHTML = `
            <div class="sidebar-panel-content">
                <div class="sidebar-panel-title">Selected Location</div>
                <div class="sidebar-panel-buttons">
                    <button class="sidebar-panel-button primary">Routing</button>
                    <button class="sidebar-panel-button secondary">Website</button>
                </div>
            </div>
        `;

        L.DomEvent.on(this._collapsedPanel, 'click', this.toggleBottomPanel, this);
    },

    _createInfoScreen: function () {
        this._infoScreen = L.DomUtil.create('div', 'sidebar-info-screen', this._sidebar);
        
        this._infoScreen.innerHTML = `
            <div class="sidebar-info-header">
                <button class="sidebar-back-button">← Zurück</button>
                <span class="sidebar-info-location-name"></span>
            </div>
            <div class="sidebar-info-content">
                <div class="sidebar-info-title"></div>
                <div class="sidebar-info-text"></div>
                <div class="sidebar-info-actions">
                    <button class="sidebar-action-button primary">Routing</button>
                    <button class="sidebar-action-button secondary">Website</button>
                </div>
            </div>
        `;

        const backButton = this._infoScreen.querySelector('.sidebar-back-button');
        L.DomEvent.on(backButton, 'click', this.hideDestinationInfo, this);
    },

    _updateDestinationsList: function () {
        if (!this._destinationsContainer) return;

        this._destinationsContainer.innerHTML = '';

        this._filteredDestinations.forEach((destination, index) => {
            const item = L.DomUtil.create('div', 'sidebar-destination-item', this._destinationsContainer);
            item.dataset.type = destination.type;
            
            item.innerHTML = `
                <div class="sidebar-destination-info">
                    <div class="sidebar-destination-name">${destination.name}</div>
                    <div class="sidebar-destination-address">${destination.address}</div>
                </div>
                <button class="sidebar-info-button">i</button>
            `;

            const infoButton = item.querySelector('.sidebar-info-button');
            L.DomEvent.on(infoButton, 'click', (e) => {
                L.DomEvent.stop(e);
                this.showDestinationInfo(destination);
            }, this);

            L.DomEvent.on(item, 'click', () => {
                this._selectDestination(destination);
            }, this);
        });
    },

    _selectDestination: function (destination) {
        // Remove previous selection
        const prevSelected = this._destinationsContainer.querySelector('.selected');
        if (prevSelected) {
            L.DomUtil.removeClass(prevSelected, 'selected');
        }

        // Add selection to clicked item
        const items = this._destinationsContainer.querySelectorAll('.sidebar-destination-item');
        items.forEach(item => {
            if (item.querySelector('.sidebar-destination-name').textContent === destination.name) {
                L.DomUtil.addClass(item, 'selected');
            }
        });

        this._selectedDestination = destination;
        
        // Update bottom panel
        if (this._expandedPanel) {
            const title = this._expandedPanel.querySelector('.sidebar-panel-title');
            title.textContent = destination.name;
            this._bottomPanelExpanded = true;
            this._updateBottomPanel();
        }

        this.fire('destination:selected', { destination: destination });
    },

    _updateBottomPanel: function () {
        if (!this._bottomPanel) return;

        if (this._bottomPanelExpanded) {
            L.DomUtil.addClass(this._expandedPanel, 'active');
            L.DomUtil.addClass(this._collapsedPanel, 'expanded');
        } else {
            L.DomUtil.removeClass(this._expandedPanel, 'active');
            L.DomUtil.removeClass(this._collapsedPanel, 'expanded');
        }
    },

    _showInfoScreen: function () {
        if (!this._selectedDestination) return;

        const titleEl = this._infoScreen.querySelector('.sidebar-info-title');
        const locationNameEl = this._infoScreen.querySelector('.sidebar-info-location-name');
        const textEl = this._infoScreen.querySelector('.sidebar-info-text');

        titleEl.textContent = this._selectedDestination.name;
        locationNameEl.textContent = this._selectedDestination.name;
        textEl.textContent = this._selectedDestination.description || 'No description available.';

        L.DomUtil.addClass(this._infoScreen, 'active');
        this._infoScreenActive = true;

        this.fire('info:shown', { destination: this._selectedDestination });
    },

    _hideInfoScreen: function () {
        L.DomUtil.removeClass(this._infoScreen, 'active');
        this._infoScreenActive = false;

        this.fire('info:hidden');
    },

    _applyTheme: function () {
        const theme = this.options.theme;
        const root = document.documentElement;
        
        root.style.setProperty('--sidebar-mc1', theme.mc1);
        root.style.setProperty('--sidebar-mc2', theme.mc2);
        root.style.setProperty('--sidebar-fc1', theme.fc1);
        root.style.setProperty('--sidebar-fc2', theme.fc2);
        root.style.setProperty('--sidebar-bc', theme.bc);
        root.style.setProperty('--sidebar-bc2', theme.bc2);
    },

    _onFilterClick: function (tab) {
        // Remove active class from all filter tabs
        const tabs = this._filterContainer.querySelectorAll('.sidebar-filter-tab');
        tabs.forEach(t => L.DomUtil.removeClass(t, 'active'));
        
        // Add active class to clicked tab
        L.DomUtil.addClass(tab, 'active');
        
        // Filter destinations
        this.filterDestinations(tab.dataset.filter);

        this.fire('filter:changed', { filter: tab.dataset.filter });
    },

    _initEvents: function () {
        L.DomEvent.disableClickPropagation(this._sidebar);
        L.DomEvent.disableScrollPropagation(this._sidebar);
    },

    _onTabClick: function (e) {
        L.DomEvent.preventDefault(e);
        
        var link = e.target;
        var id = link.hash.slice(1);
        
        this.open(id);
    },

    _onCloseClick: function () {
        this.close();
    },

    _onClick: function () {
        this.close();
    },

    _setupAutopan: function () {
        if (!this.options.autopan || !this._map.getCenter) return;

        var mapBounds = this._map.getBounds();
        var sidebarBounds = L.latLngBounds(mapBounds);

        if (this.options.position === 'left') {
            sidebarBounds._southWest.lng += (mapBounds.getEast() - mapBounds.getWest()) * 0.4;
        } else {
            sidebarBounds._northEast.lng -= (mapBounds.getEast() - mapBounds.getWest()) * 0.4;
        }

        if (!sidebarBounds.contains(this._map.getCenter())) {
            this._autopanRestore = L.bind(function() {
                this._map.setView(this._map.getCenter(), this._map.getZoom(), { animate: false });
            }, this);
            
            this._map.fitBounds(sidebarBounds, { animate: false });
        }
    },

    _clearTimeout: function () {
        if (this._timeout) {
            clearTimeout(this._timeout);
            delete this._timeout;
        }
    }
});

L.control.sidebar = function (placeholder, options) {
    return new L.Control.Sidebar(placeholder, options);
};