<?php
	if ( ! defined('LVS_APP')) define('LVS_APP', true); 
	class LVS{ 
		public $_APP_CODE; 
		public $_APP_APIKEY; 
		private $_HOST_URL; 
		private $_HOST_APIURL; 
		private $_CLIENT_DOMAIN; 
		private $_CLIENT_IP; 
		private $_FIX_PARAMS; //constructor AND optional params 
		
		function __construct($params=array())
		{ 
			$this->_HOST_URL="https://m-pedia.my.id/"; 
			$this->_HOST_APIURL=$this->_HOST_URL."/api/v1/"; 
			// $this->_CLIENT_DOMAIN=$_SERVER['HTTP_HOST']; 
			$this->_CLIENT_DOMAIN='localhost'; 
			$this->_CLIENT_IP='127.0.0.1'; 
			$this->initialize($params); 
			$this->_FIX_PARAMS="&apikey=".urlencode($this->_APP_APIKEY)."&host=".urlencode($this->_CLIENT_DOMAIN)."&host_ip=".urlencode($this->_CLIENT_IP); 
		} // change parameters after object initialization 
		
		public function initialize($params=array())
		{
			isset($params['app_code']) && !empty($params['app_code']) ? $this->_APP_CODE = $params['app_code'] : $this->_APP_CODE = '117'; isset($params['app_apikey']) && !empty($params['app_apikey']) ? $this->_APP_APIKEY = $params['app_apikey'] : $this->_APP_APIKEY = 'sdvtUM9UREFStQ$E0EEEZghD'; 
		} //get single product information 
		
		public function get_product_info($app_code='')
		{ 
			empty($app_code) ? $code=$this->_APP_CODE : $code=$app_code; $url=$this->_HOST_APIURL."getdata/products?code=".urlencode($code); 
			$response=$this->explore_url($url); 
			return $response; 
		} //get all products 
		
		public function get_products_list($app_code='',$page=0)
		{ 
			empty($app_code) ? $code=$this->_APP_CODE : $code=$app_code; $url=$this->_HOST_APIURL."getdata/products?limit=200&page=".urlencode($page); 
			$response=$this->explore_url($url); 
			return $response; 
		} //get single license information 
		
		public function get_license_info($licensekey)
		{ 
		$url=$this->_HOST_APIURL."getdata/licenses?licensekey=".urlencode($licensekey); 
			
			$response=$this->explore_url($url); return $response; 
			
		} //get all licenses of a products 
		
		public function get_product_licenses_list($app_code='',$page=0){ 
			empty($app_code) ? $code=$this->_APP_CODE : $code=$app_code; $url=$this->_HOST_APIURL."getdata/licenses?limit=200&page=".urlencode($page)."&code=".urlencode($code); $response=$this->explore_url($url); return $response; 
		} //get all licenses 
		
		public function get_licenses_list($page=0){ $url=$this->_HOST_APIURL."getdata/licenses?limit=200&page=".urlencode($page); $response=$this->explore_url($url); return $response; 
		} //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// //issue envato license from the application 
		public function issue_envato_license($envatocode,$client_email,$client_name,$client_mobile='',$address=''){ $url=$this->_HOST_APIURL."issue/envatolicense?envatocode=".urlencode($envatocode); $url.="&app_code=".urlencode($this->_APP_CODE); $url.="&customer_email=".urlencode($client_email); $url.="&customer_name=".urlencode($client_name); $url.="&customer_mobile=".urlencode($client_mobile); $url.="&customer_address=".urlencode($address); $url.="&comments=".urlencode("License issued to customer against envatocode:".$code." \n Date:".date('D-M-Y h:i:s A')); $response=$this->explore_url($url); return $response; 
		} //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// //validate envato code 
		
		public function is_valid_envatocode($envatocode,$checklicense=true){ 
			
			$url=$this->_HOST_APIURL."validate/envatocode?envatocode=".urlencode($envatocode)."&app_code=".urlencode($this->_APP_CODE); if($checklicense){$url.="&checklic=".urlencode('yes');
			} 
			$response=$this->explore_url($url); 
			if(isset($response->code) && $response->code==600){ 
				return true; 
			} 
			return isset($response->reason) ? $response->reason : false; 
		} //validate license 
		
		public function is_valid_license($licensekey,$force_host_binding=true)
		{ 
			$url=$this->_HOST_APIURL."validate/license?licensekey=".urlencode($licensekey)."&apikey=".urlencode($this->_APP_APIKEY); 
			
			if($force_host_binding){ 
				$url.="&host=".urlencode($this->_CLIENT_DOMAIN); 
				$url.="&host_ip=".urlencode($this->_CLIENT_IP); 
			}
			
			$response=$this->explore_url($url,false); 
			if($response->code==600){ 
				return true; 
			} 
			return false; 
		} //check for new updates 
		
		public function is_updates_availeable($current_version)
		{ 
			
			if($this->is_connected())
			{ 
				$metadata=$this->get_product_info(); 
				if(isset($metadata->data[0]->version_code) && $metadata->data[0]->version_code > intval($current_version))
				{ 
					return true; 
				} 
			} 
			return false; 
		} ////////////////////////////////////////////////////////////////////////////// ////////////////////////////////////////////////////////////////////////////// //check if connected to server 
		
		private function is_connected()
		{ 
			$connected = @fsockopen($this->_host_url, 80); //website, port (try 80 or 443) 
			if ($connected){ 
				fclose($connected); 
				return true; 
			}elseif(fopen("http://www.google.com:80/","r"))
			{ 
				return true; 
			} 
			return false; 
		} //make call to server 
		
		private function explore_url($url,$add_fix_params=true)
		{ 
			if($add_fix_params){
				$url.=$this->_FIX_PARAMS;
			} 
			$ch=curl_init(); 
			curl_setopt_array($ch, array(CURLOPT_URL => $url, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20 )); //response 
			
			$response = curl_exec($ch); 
			if (curl_errno($ch) > 0)
			{
				$arrContextOptions=array("ssl"=>array("verify_peer"=>false,"verify_peer_name"=>false,),); 
				$response=file_get_contents($url,false,stream_context_create($arrContextOptions)); 
				if(empty($response))
				{ 
					if($stream=fopen($url, 'r')){ 
						$response=stream_get_contents($stream); 
						fclose($stream); 
						}else{ 
						return null; // print 
						curl_error($ch); 
					} 
				} 
			} //result in object format 
			$data = json_decode($response);
			curl_close($ch); 
			return $data; 
		} //////////////////////////////////////////////// END OF CLASS ///////////////////// 
	}									