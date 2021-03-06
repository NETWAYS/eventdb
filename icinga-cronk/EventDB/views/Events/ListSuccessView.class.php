<?php

class EventDB_Events_ListSuccessView extends EventDBBaseView {
	
	public function executeHtml(AgaviRequestDataHolder $rd) {
		$this->setupHtml($rd);
	
		$this->setAttribute('_title', 'EventDB.Events.List');
	}
	
	public function executeJson(AgaviRequestDataHolder $rd) {
		$edb = $this->getContext()->getModel('EventDB', 'EventDB');	
		$qfilter = $rd->getParameter("hostQuickFilter",array());
		
		$filter =  $rd->getParameter('filter', array());
		$filter[] = $qfilter;
			
		if(empty($filter))
			$filter = false;

		
		$db = $edb->getEvents(array(),
				$rd->getParameter('offset', 0),
				$rd->getParameter('limit', false),
				array(
                    'simple' => $rd->getParameter('simple',false) ? true : false,
					'order_by' => $rd->getParameter('order_by',false),
					'dir' => $rd->getParameter('dir','DESC'),
					'target' => $rd->getParameter('target', 'EventDbEvent'),
				    'columns' => $rd->getParameter('columns', array('*')),
				    'group_by' => $rd->getParameter('group_by', false),
				    'filter' => $filter,
                    'group_leader' => $rd->getParameter('group_leader',false)
					//'count' => $rd->getParameter('count','id')
				)
			);

		return json_encode($this->recursiveUTF8Encode(array(
			'events' => $db["values"]
//			'count' => $db["count"]
		)));
	}

    public function recursiveUTF8Encode($val)
    {
        foreach ($val as &$value) {
            if (is_array($value)) {
                $value = $this->recursiveUTF8Encode($value);
            } else {
                $value = utf8_encode($value);
            }
        }
        return $val;
    }
}
