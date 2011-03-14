<?php

class Cronks_EventDB_Events_ListSuccessView extends CronksBaseView {
	
	public function executeHtml(AgaviRequestDataHolder $rd) {
		$this->setupHtml($rd);
	
		$this->setAttribute('_title', 'EventDB.Events.List');
	}
	
	public function executeJson(AgaviRequestDataHolder $rd) {
		$edb = $this->getContext()->getModel('EventDB.EventDB', 'Cronks');	
		$qfilter = $rd->getParameter("hostQuickFilter",array());
		
		$filter =  $rd->getParameter('filter', array());
		$filter[] = $qfilter;
			
		if(empty($filter))
			$filter = false;

		
		$db = $edb->getEvents(array(),
				$rd->getParameter('offset', 0),
				$rd->getParameter('limit', false),
				array(
					'order_by' => $rd->getParameter('order_by',false),
					'dir' => $rd->getParameter('dir','DESC'),
					'target' => $rd->getParameter('target', 'EventDbEvent'),
				    'columns' => $rd->getParameter('columns', array('*')),
				    'group_by' => $rd->getParameter('group_by', false),
				    'filter' => $filter, 
					'count' => $rd->getParameter('count','id')
				)
			);
		
		return json_encode(array(
			'events' => $db["values"],	
			'count' => $db["count"]  
					
		));
	}

}