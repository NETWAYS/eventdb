Ext.ns("Cronk.EventDB");

Cronk.EventDB.MainView = function(cfg) {

	var CE = cfg.CE;
	this.id = CE.id;

	var parentCmp = cfg.parentCmp;
	var url = cfg.eventUrl;
	var commentUrl = cfg.commentUrl;
	var commentAddUrl = cfg.commentAddUrl;
	var userName = cfg.userName;
	var ackFilterBtn = new Ext.Button({
		text: _('Ack'),
		iconCls: 'icinga-icon-accept',
		enableToggle: true,
		listeners :  {
			toggle: function(e,state) {
				e.setIconClass('icinga-icon-'+(state ? 'cancel' : 'accept')); 
				fm.toggleAcknowledged(!state);

				eventGrid.refreshTask.delay(1500);		
			}	
		}
	});	
	
	var quickFilterBar = new Ext.ButtonGroup({
		xtype: 'buttongroup',
		text: _('Priority'),
		defaults: {
			xtype: 'button',
			bubbleEvents: ['toggle'],
			enableToggle: true
		},
		events: ['toggle'],
		listeners: {
			toggle: function(e) {

				var elem = e.findParentByType('buttongroup');
				var btns = elem.findByType('button');
                fm.togglePriority(e.value.toString(), e.pressed)
				
				eventGrid.refreshTask.delay(1500,null,eventGrid);
			},
			scope:this
		},

		syncWithFilter: function(f) {
            
			var filter = f || fm.getFilterObject();
			var filterBtn
			if(parentCmp.el)
				filterBtn = Ext.DomQuery.selectNode('.filterBtn',parentCmp.el.dom);
			if(fm.hasActiveFilter() && filterBtn) {
				Ext.get(filterBtn).addClass('activeFilter');
			} else if(filterBtn) {
				Ext.get(filterBtn).removeClass('activeFilter');
                
			}
            if(!fm.showsAcknowledged()) {
				ackFilterBtn.toggle(true,true);
				ackFilterBtn.setIconClass('icinga-icon-cancel');
			} else {
				ackFilterBtn.toggle(false,true);
				ackFilterBtn.setIconClass('icinga-icon-accept');	
			}
			filter = filter.priorityExclusion;		
			if(!filter) {
				return true;
			}
			Ext.iterate(this.items.items,function(i) {
				if(filter.indexOf(i.value.toString()) > -1 || filter.indexOf(i.value) > -1) {
					
					i.toggle(false,true);	
				} else {	
					i.toggle(true,true);	
				}
			
			});
	
		},
		items: [
		{
			text: 'E',
			ctCls: 'tag emergency',	
			pressed: true,
			tooltip: _('Show emergency'),	
			value: 0
		},{
			text: 'A',
			ctCls: 'tag alert',
			pressed: true,
			tooltip: _('Show alert'),	
			value: 1	
		},{
			text: 'C',
			ctCls: 'tag critical',
			tooltip: _('Show critical'),
			pressed: true,	
			value: 2
		},{
			text: 'Er',
			ctCls: 'tag error',
			tooltip: _('Show error'),
			pressed: true,	
			value: 3
		},{
			text: 'W',
			ctCls: 'tag warning',
			tooltip: _('Show warning'),
			pressed: true,	
			value: 4
		},{
			text: 'N',
			ctCls: 'tag notice',
			tooltip: _('Show notice'),
			pressed: true,	
			value: 5
		},{
			text: 'I',
			tooltip: _('Show info'),
			ctCls: 'tag info',	
			pressed: true,	
			value: 6
		},{
			text: 'D',
			tooltip: _('Show debug'),
			ctCls: 'tag debug',	
			pressed: true,	
			value: 7
		}]
	});


	var eventStore = new Ext.data.JsonStore({
		autoLoad:false,
		autoDestroy:true,
		baseParams: {
			offset:0,
			count: 'id',	
			limit:25
		},
		remoteSort: true,
		paramNames: {
			start: 'offset'
		},
		url: url,
		root: 'events',
		totalProperty: 'count',
		fields: [
			{name: 'id'},
			{name: 'host_name'},
			{name: 'address'},	
			{name: 'facility'},
			{name: 'priority'}, 
			{name: 'program'},
			{name: 'created'},
			{name: 'modified'},
			{name: 'message'},
			{name: 'ack'},
			{name: 'type'},
			{name: 'real_host'}
	]
	});

	var commentStore = new Ext.data.JsonStore({
		autoLoad: false,
		autoDestroy: true,
		baseParams: {
			offset:0,
			limit:25,
			count: 'id'
		},
		totalProperty: 'count',
		paramNames: {
			start: 'offset'
		},
		url: commentUrl,
		root: 'comments',
		fields: [
			{name: 'id'},
			{name: 'user'},
			{name: 'message'},
			{name: 'type'},
			{name: 'created'}
		]
	});

	var fm = new Cronk.EventDB.FilterManager({url: url, parentCmp: parentCmp});
	
	fm.addListener('applyFilter', function(filters) {		
			
		eventGrid.fireEvent('statechange');
		eventGrid.setPageSize(filters.display.limit);
		eventStore.baseParams = {"jsonFilter": Ext.encode(filters)};
        
		Cronk.Registry.get(CE.id).params.FilterJSON = Ext.encode(fm.getFilterObject());
		quickFilterBar.syncWithFilter();
		eventGrid.refresh();
	},this,{buffer:true});
	
	var checkColumn = function(config){
		Ext.apply(this, config);
		if(!this.id){
			this.id = Ext.id();
		}
		this.initialValues = {};
		this.renderer = this.renderer.createDelegate(this);
	};
	
	checkColumn.prototype = {
		init: function(grid){
			this.grid = grid;
			this.grid.on('render', function(){
				var view = this.grid.getView();
				view.mainBody.on('mousedown', this.onMouseDown, this);
			}, this);
		},
	
		onMouseDown: function(e, t){
			if(Ext.fly(t).hasClass(this.createId())){
				e.stopEvent();
				el = Ext.get(t);
				var index = this.grid.getView().findRowIndex(t);
				var record = this.grid.store.getAt(index);
				if(!this.grid.selectedRecords) {
					this.grid.selectedRecords =[];
				}
				if(!el.hasClass('x-grid3-check-col-on')) {
					this.grid.selectedRecords.push(record);
					el.replaceClass('x-grid3-check-col','x-grid3-check-col-on'); 
					
				} else {
					
					this.grid.selectedRecords.remove(record);
					el.replaceClass('x-grid3-check-col-on','x-grid3-check-col'); 
				}
				this.grid.updateCommentButton();
			}
		},
	
		renderer: function(v, p, record) {
			if (this.initialValues[record.id]) {
				this.grid.updateCommentButton();
			} else {
				this.initialValues[record.id] = v;
			}
			p.css += ' x-grid3-check-col-td';
			return String.format('<div record="'+record.id+'"class="x-grid3-check-col{0} {1}">&#160;</div>', (this.grid.selectedRecords || []).indexOf(record) > -1 ? '-on' : '', this.createId());
		},
	
		createId: function(){
			return 'x-grid3-cc-' + this.id;
		}
	};
	
	var ack = new checkColumn({
		header: _(''),
		dataIndex: 'ack',
		width: 25,
		fixed: true,
		menuDisabled: true
	});
	
	var _commentGrid = Ext.extend(Ext.grid.GridPanel, {
		getState: function() {
			var state = {
				height: this.getHeight(),
				width: this.getWidth(),
				storeParams: this.store.baseParams
			};
		
			this.resumeEvents();
		},
		applyState: function(state) {
			this.setHeight(state.height);
			this.setWidth(state.width);
			this.store.baseParams = state.storeParams;
		}
	});
	
	var commentGrid = new _commentGrid({
		store: commentStore,
		stateId: 'db-commentGrid-' + this.id,
		stateful: true,
		stateEvents: ['sortchange','columnresize','columnmove'],
		colModel: new Ext.grid.ColumnModel({
			defaults: {
				width: 80,
				sortable: true
			},
			columns: [
				{header: _('Type'), dataIndex: 'type',renderer: function(v) {
					switch(v) {
						case '0':
							return '<div class="icon-16 icinga-icon-note" qtip="'+_('Comment')+'"></div>';
						case '1':
							return '<div class="icon-16 icinga-icon-accept" qtip="'+_('Acknowledge')+'"></div>';
						case '2':
							return '<div class="icon-16 icinga-icon-cancel" qtip="'+_('Revoke')+'"></div>';
					}	
				}},
				{header: _('Author'), dataIndex: 'user'},
				{header: _('Created'), dataIndex: 'created', width: 150},
				{header: _('Message'), dataIndex: 'message', width: 200}
			]
		}),
		bbar: new Ext.PagingToolbar({
			pageSize: 25,
			store: commentStore,
			displayInfo: true,
			displayMsg: _('Displaying comments {0} - {1} of {2}'),
			emptyMsg: _('No comments to display')
		}),
		frame: true,
		border: false
	});
	
	var commentForm = (function() {
		oWin = null;

		return {
			show : function() {
				if(!oWin){
					oWin = new Ext.Window({
						title: _('Acknwoledge/Add comment'),
						layout: 'fit',
						region: 'center',
						width: 500,
						height: 320,
						closeAction: 'hide',
						plain: false,
						modal: true,
						items: new Ext.FormPanel({
							labelAlign: 'top',
							layout: 'form',
							frame: true,
							url: commentAddUrl,	
							items: [{
								xtype: 'textfield',
								fieldLabel: _('Author'),
								readOnly: true,
								name: 'author',
								allowBlank: false,
								width: 460,
								height: 20,
								value: userName
							},{
								xtype: 'radiogroup',
								showText:true,
								defaults: {
									xtype: 'radio'	
								},
								layout: 'form',
								labelWidth: 120,
								items: [{	
									boxLabel: '<span  style="padding-left:18px;height:18px;" qtip="'+_('Comment')+'" class="icon-16 icinga-icon-note">'+_('Comment only')+'</span>',	
									name: 'type',
									checked: true,
									inputValue: 'type_0'
								},{	
									boxLabel: '<span  style="padding-left:18px;height:18px;" qtip="'+_('Acknowledge')+'" class="icon-16 icinga-icon-accept">'+_('Acknowledge')+'</span>',	
									name: 'type',
									inputValue: 'type_1'
								},{	
									boxLabel: '<span style="padding-left:18px;height:18px;" qtip="'+_('Revoke')+'" class="icon-16 icinga-icon-cancel">'+_('Revoke ack')+'</span>',	
									name: 'type',	
									inputValue: 'type_2'
								}]
							},{
								xtype: 'textarea',
								fieldLabel: _('Comment'),
								name: 'message',
								width: 460,
								height: 130,
								allowBlank: true
							}],
							buttons: [{
								text: 'Submit',
								handler: function() {
									oForm = this.findParentByType(Ext.FormPanel);
									if (oForm.getForm().isValid()) {
										var vals = oForm.getForm().getValues();
										vals.type = vals.type.split('_')[1];
										
										var events = [];
										var params = {};
										
										Ext.iterate(eventGrid.selectedRecords, function(r) {
											var ignored = [];
											if (vals.type == 0 ||
												(vals.type == 1 && r.get('ack') != 1) ||
												(vals.type == 2 && r.get('ack') == 1)) {
											  
												events.push(r.get('id'));
											} else {
												ignored.push({
													host: r.get('host_name'),
													msg: r.get('message'),
													cr: r.get('created')
												});	
											}
										});							
										eventsJson = Ext.encode([Ext.apply(vals, {ids: events})]);
										eventGrid.unselectAll();
										oForm.getForm().submit({
											params: Ext.apply({'comments': eventsJson}, params),
											success: function(oForm, action) {
												AppKit.notifyMessage(_('Request successful'), action.result.message);
												// TODO: Reload only if selected.
												eventGrid.refresh();
												if ('event' in commentStore.baseParams) {
													commentStore.load();
												}
											}
										});
										oWin.hide();
									}
								}
							},{
								text: 'Close',
								handler: function() {
									oWin.hide();
								}
							}]
						})
					});
					parentCmp.add(Ext.clean(oWin));
					parentCmp.doLayout();
				}
				oWin.show(this);
			}
		}
	})();

	var _eventGrid = Ext.extend(Ext.grid.GridPanel, {
		setPageSize: function(size) {
			this.bottomToolbar.pageSize = size;
		},
		constructor: function(cfg) {
			Ext.apply(this,cfg);
			this.bbar = new Ext.PagingToolbar({
				pageSize: 25,
				id: 'pager_'+this.id,
				store: eventStore,
				displayInfo: true,
				displayMsg: _('Displaying events {0} - {1} of {2}'),
				emptyMsg: _('No events to display')	
			});

			this.addEvents({
				'statechange': true,
				'hostFilterChanged': true
			});
			Ext.grid.GridPanel.prototype.constructor.call(this);
			this.store.on("beforeload",function() {

                var f = fm.getFilterObject();
                var isEmpty = true;
                for(var i in f) {
                    isEmpty = false;
                    break;
                }
                if(isEmpty) {
                    f = fm.getFilterObject(true);
                }
                var sortState = this.getSortState();
                
                if(Ext.isObject(sortState)) {
                    f.display.order =
                    {
                        dir: sortState.direction.toLowerCase(),
                        field: sortState.field
                    }
                }
                if(!this.ignoreBaseFilter) {
                    quickFilterBar.syncWithFilter();
                }

                this.setBaseParam('jsonFilter',Ext.encode(f));

			},this.store);
			this.store.on("load", function() {
				this.buildInterGridLink();
				this.updateSelected();
			},this)
			this.reenableTextSelection();
		},

		buildInterGridLink: function() {
			var elems = Ext.DomQuery.select('span[isHostField=true]',parentCmp.el.dom);
			Ext.iterate(elems,function(elem) {
				Ext.get(elem).on("click",function(ev,e) {
					var host_name = e.getAttribute('hostName');	
					if(!host_name)
						return true;
					var cronk = {
						parentid: Ext.id(),
						title: 'Services for '+host_name,
						crname: 'gridProc',
						closable: true,
						params: {template: 'icinga-service-template'}
					};
					var filter = {};
				
					filter["f[host_name-value]"] = host_name; 	
					filter["f[host_name-operator]"] = 50;

					Cronk.util.InterGridUtil.gridFilterLink(cronk, filter);
				});
			});
		},
		
		unselectAll: function(viewOnly) {
			if(!viewOnly) {
				this.selectedRecords = [];
	 		}
			var elem = Ext.DomQuery.select('.x-grid3-check-col-on',parentCmp.el.dom);
			Ext.iterate(elem,function(i) {
				Ext.get(i).replaceClass('x-grid3-check-col-on','x-grid3-check-col',parentCmp.el.dom);
			},this);
			this.updateCommentButton();
		},
		selectAll: function() {
			var elem = Ext.DomQuery.select('.x-grid3-check-col',parentCmp.el.dom);
			Ext.iterate(elem,function(i) {	
				Ext.get(i).replaceClass('x-grid3-check-col','x-grid3-check-col-on',parentCmp.el.dom);	
				var id = Ext.get(i).getAttribute("record");
				this.selectedRecords.push(this.store.getById(id));
			},this);
			
			this.updateCommentButton();
		},
		updateCommentButton: function() {
			if(this.selectedRecords.length) {
				this.commentButton.enable();
				this.commentButton.setText(_('Acknowledge/Comment')+' ('+this.selectedRecords.length+')');	  		
			} else {
				this.commentButton.setText('Acknowledge/Comment');
				this.commentButton.disable();
			}
		},
		updateSelected: function() {
			this.unselectAll(true);
			Ext.iterate(this.selectedRecords,function(r) {
				var elem = Ext.DomQuery.select('div.x-grid3-check-col[record='+r.id+']',parentCmp.el.dom);
				Ext.iterate(elem, function(i) {	
					Ext.get(i).replaceClass('x-grid3-check-col','x-grid3-check-col-on',parentCmp.el.dom);	
				},this)
			},this);
			this.updateCommentButton();	
		
		},
		/**
		* http://extjs.com/forum/showthread.php?t=22218
		* For non-IE browsers, this is fixed with a CSS addition.
		*/
		reenableTextSelection : function(){
			var grid = this;
			if(Ext.isIE){
				grid.store.on("load", function(){
					var elems=Ext.DomQuery.select("div[unselectable=on]", parentCmp.el.dom);
					for(var i=0, len=elems.length; i<len; i++){
						elems[i].unselectable = "off";
					}
				});
			}
		},
		
		// buffer store reload
		refreshTask : new Ext.util.DelayedTask(function() {
			if(this.store)
				this.store.load();
			else 
				eventStore.load();
			quickFilterBar.active = true;
			
		}),
		refresh: function() {
			this.refreshTask.delay(1000,null,this);
		},
		resolveType: function(v) {	
			switch(v) {
				case '0':
					return 'Syslog';	
				case '1':
					return 'SNMP';
				case '2':
					return 'Mail';
				default:
					return 'Unknown';	
			}	
		},
		
		getState: function() {
		
			var state = {
				height: this.getHeight(),
				width: this.getWidth(),
				storeParams: this.store.baseParams,
				filters: fm.getFilterObject()
			};




			return state;
		},
		applyState: function(state) {	
			
			if(state.colModel)
				this.getColumnModel().setConfig(Ext.decode(state.colModel))
			this.setHeight(state.height);
			this.setWidth(state.width);
			this.store.baseParams = state.storeParams;
			
			if(state.filters) {
                fm.setFilterObject(state.filters);
            }
		
			this.setPageSize(fm.getDisplayLimit());
			quickFilterBar.syncWithFilter();
		},
		viewConfig: {
			
			getRowClass: function(record,index) {
				return 'tag '+record.get('priority').toLowerCase();	
			}
		}
	});

	var eventGrid = new _eventGrid({
		id: "evGrid_"+this.id,
		
		columns: [{
				showHeader:false,
				width:18,
				fixed:true,
				menuDisabled: true,
				dataIndex: 'type',
				renderer: function(v,cell,record) {
					var t = eventGrid.resolveType(v);
					var qtip = '<b>'+t+' - '+record.get('priority')+' :</b> <br/> ';
					qtip += Ext.util.Format.htmlEncode(record.get('message'));
					return '<div style="margin-left:-16px" class="eventdb-type '+t.toLowerCase()+'">'+ 
						'<div qtip="'+qtip+'" class="icon-16"></div></div>';
				}
			},ack,{
				dataIndex: 'id',
				id: 'id',
				hidden:true,
				header: _('ID'),
				sortable: true,
				width: 75
			},{
				dataIndex: 'ack',	
				header: _('Ack'),
				menuDisabled: true,
				renderer: function(v,meta,record,rowIdx,colIdx) {
					return '<div class="icon-16 icinga-icon-'+(v == 1 ? 'accept' : 'none' )+'"></div>';	
				},
				width:25
			},{
				dataIndex: 'type',
				header: _('Source'),
				sortable: true,
				width: 100,
				renderer: function(v) {
					var typename = eventGrid.resolveType(v);
					
					return '<span class="eventdb-type '+typename.toLowerCase()+'">'+ 
						'<div style="float:left" class="icon-16"></div>'+typename+'</span>';
				}
			},{
				dataIndex: 'host_name',
				header: _('Host'),
				sortable: true,
				width: 100,
				renderer: function(v,meta,rec) {
					var host_name = "";
					var style = "";
					if(rec.get('real_host')) {
						host_name = "hostName='"+v+"'";
						style = "style='color:blue;text-decoration:underline;cursor:pointer'";
					}
					return '<span isHostField="true" '+host_name+' '+style+' class="eventdb-host '+v.toLowerCase()+'">'+ 
						'<div style="float:left" class="icon-16"></div>'+v+'</span>';
				}
			},{
				dataIndex: 'address',
				header: _('Address'),
				hidden: true,
				width: 100
			},{
				dataIndex: 'priority',
				header: _('Priority'),
				sortable: true,
				width: 100,
				renderer: function(v) {
					return '<div class="tag '+v.toLowerCase()+'">'+v+'</div>';
				}
			},{
				dataIndex: 'message',
				header: _('Message'),
				sortable: true,
				width: 200,
				renderer: function(v) {
					return '<div qtip="'+Ext.util.Format.htmlEncode(v)+'">'+Ext.util.Format.htmlEncode(v)+'</div>';	
				}
			},{
				dataIndex: 'program',
				header: _('Program'),
				sortable: true,
				renderer: function(v) {
					return '<span class="eventdb-program '+v.toLowerCase()+'">'+ 
						'<div style="float:left" class="icon-16"></div>'+v+'</span>';
				},
				width: 100
			},{
				dataIndex: 'facility',
				header: _('Facility'),
				sortable: true,
				renderer: function(v) {
					if(!v)
						return "INVALID FACILITY!";
					return '<span class="eventdb-facility '+v.toLowerCase()+'">'+ 
						'<div style="float:left" class="icon-16"></div>'+v+'</span>';
				},
				width: 100
			},{
				dataIndex: 'created',
				header: _('Created'),
				sortable: true,
				width: 200
			}
		],
		store: eventStore,
		stateId: 'db-eventGrid-' + this.id,
		stateful: true,
		stateEvents: ['statechange','sortchange','columnresize','columnmove'],
		tbar: [{
			iconCls: 'icinga-icon-arrow-refresh',
			text: _('Refresh'),
			tooltip: _('Refresh the data in the grid'),
			handler: function(oBtn, e) {eventGrid.refresh();},
			scope: this
		},{
			iconCls: 'icinga-icon-cog',
			text: _('Settings'),
			menu: {
				items: [{
					text: _('Auto refresh'),
					checked: false,
					id: 'refreshBtn_'+this.id,
					checkHandler: function(checkItem, checked) {
						if (checked == true) {
							if(this.trefresh)
								this.trefresh.stop();
							this.trefresh = AppKit.getTr().start({
								run: function() { 
									if(!eventGrid.getStore())
										return false;
									if(eventGrid.getStore().proxy)
										if(eventGrid.getStore().proxy.getConnection())
											if(eventGrid.getStore().proxy.getConnection().isLoading())
												return true;
									eventGrid.getStore().load();
								},
								interval:  20000,
								scope: this
							});
						}
						else {
							AppKit.getTr().stop(this.trefresh);
							delete this.trefresh;
						}
					}
				}]
			},
			scope: this
		},'-',{
			text: _('Select All '),
			handler: function(btn) {
				eventGrid.selectAll();
			},
			scope: this
		},{
			text: _('Clear selection '),
			handler: function(btn) {
				eventGrid.unselectAll();
			},
			scope: this
		},'-',{
			text: _('Filter'),
			cls: 'filterBtn',
			iconCls: 'icinga-icon-pencil',
			listeners: {
				render: function(e) {
					if(fm.hasActiveFilter())
						e.addClass('activeFilter');
					else
						e.removeClass('activeFilter');
				}
			},
			menu: {
				items: [{
					text: _('Edit '),
					iconCls: 'icinga-icon-application-form',
					handler: function() {
						eventGrid.store.ignoreBaseFilter = false;
						fm.show();
					},
					scope: this
				},{
					text: _('Remove'),
					iconCls: 'icinga-icon-cancel',
					handler: function() {
						fm.show(true);
						fm.clearFilterFields();
						eventStore.baseParams = {offset:0, limit:25};
               			eventGrid.fireEvent("statechange");

						eventGrid.refresh();
					},
					scope: this
				}]
			}
		},'-',ackFilterBtn,'-',quickFilterBar,'-',new Ext.form.TextField({
			xtype: 'textfield',
			emptyText: _('Host name'),
			enableKeyEvents: true,
			value: (CE.params || {}).hostQuickFilter, 
			listeners:{ 
				blur: function(el) {
					var value = el.getValue();
					eventStore.setBaseParam('hostQuickFilter',value || null);
					eventGrid.refresh();				
				},
				keydown: function(el) {
					var value = el.getValue();
					eventStore.setBaseParam('hostQuickFilter',value || null);
					eventGrid.refresh();
				},
				scope: this
			}
		
		}),'-',{
			text:'Acknowledge/Comment',
			tooltip:'Add comment to your acknoledgement',
			iconCls:'icinga-icon-add',
			ref: '../commentButton',
			handler: function() {commentForm.show();},
			disabled: true
		}],
		sm: false,		
		plugins: ack,
		
		autoScroll: true,
		listeners: {
			defaults: {
				scope: this
			},
			rowclick: function(grid, rowIndex, e) {
				commentStore.baseParams = {event: grid.getStore().getAt(rowIndex).get('id'), offset: 0, limit: 25};
				commentStore.load();
				commentGrid.findParentByType('panel').show();
				commentGrid.findParentByType('panel').expand();		
			},
			keydown: function(ev) {
				if(ev.keyCode == 32) {
					var toDelete = [];
					var toAdd = [];
					Ext.iterate(Ext.DomQuery.select('.x-grid3-row-selected',this.el.dom),function(sRow) {			
						ev.stopEvent();
						var el = Ext.get(Ext.DomQuery.select('.x-grid3-check-col, .x-grid3-check-col-on',sRow)[0]);
						var index = this.getView().findRowIndex(sRow);
						var record =this.store.getAt(index);
					  	if(!this.selectedRecords) 
							this.selectedRecords =[];
						if(!el.hasClass('x-grid3-check-col-on')) {
							this.selectedRecords.push(record);
					  		el.replaceClass('x-grid3-check-col','x-grid3-check-col-on'); 
							toAdd.push([el,record]);
						} else {
							toDelete.push([el,record]);
						}

					},this);
					if(!toAdd.length) {
						Ext.iterate(toDelete,function(e) {
							this.selectedRecords.remove(e[1]);
			  				e[0].replaceClass('x-grid3-check-col-on','x-grid3-check-col'); 
						},this);
					}

					this.updateCommentButton();
					ev.preventDefault();
					return false;
				}
			},	
			beforerender: function(_this) {
				_this.fireEvent('hostFilterChanged', _this, true);
			},
			show: function(_this) {
				_this.store.load();
				_this.updateSelected();	

			},
			hostFilterChanged: function(_this, fromrender) {	
		
				fromrender = fromrender || false;
				this.unselectAll();
				if (parentCmp.hostFilter) {					
					if (!fromrender) {
						eventGrid.store.load();
					}
					_this.fireEvent('statechanged');
				}
			}
		},
		border: false
	});
	
	var _IcingaEventDBCronk = Ext.extend(Ext.Container, {
		constructor: function(config) {
			Ext.Container.prototype.constructor.call(this, config);
		},
		
		applyHostFilter: function() {
			eventGrid.fireEvent('hostFilterChanged', eventGrid);
		}
	});
	
	var IcingaEventDBCronk = new _IcingaEventDBCronk({
		layout: 'border',
		width: parentCmp.getInnerWidth()*0.98,
		items: [{
			region:'center',
			xtype:'panel',
			layout:'fit',
			border:false,
			items: eventGrid
		},{
			xtype: 'panel',
			region: 'south',
			title: 'Comments',
			height: 200,
			collapsible: true,
			split: true,
			collapsed: true,
			hidden: true,
			layout: 'fit',
			border: false,
			items: commentGrid
		}]
	});
	
	CE.add(IcingaEventDBCronk);
	CE.doLayout()
	
	
	if(CE.params.hostQuickFilter) {
		eventStore.baseParams = Ext.apply(eventStore.baseParams || {},{hostQuickFilter: CE.params.hostQuickFilter});
	}
	if(CE.params.FilterJSON) {	
		var params = Ext.decode(CE.params.FilterJSON);
			

		for(var i=0;i<params.priorityExclusion.length;i++) {
			params.priorityExclusion[i] = parseInt(params.priorityExclusion[i],10);
		}
		for(var i=0;i<params.facilityExclusion.length;i++) {
			params.facilityExclusion[i] = parseInt(params.facilityExclusion[i],10);
		}
	
		quickFilterBar.syncWithFilter(params);
	
		eventStore.baseParams = Ext.apply(eventStore.baseParams || {},{jsonFilter: fm.getFilterObject()});
		eventGrid.fireEvent('hostFilterChanged', eventGrid);
		
	}
	if((AppKit.getPrefVal('org.icinga.autoRefresh') && AppKit.getPrefVal('org.icinga.autoRefresh') != 'false'))
		Ext.getCmp('refreshBtn_'+this.id).setChecked(true);
	eventGrid.refreshTask.delay(1000);  
}
