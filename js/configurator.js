window.Configurator=function(defaultConfig,persistent){
  //The default object
  var config = defaultConfig||{};
  var persistent=persistent||[];
  //this is an array of configuration keys that remain persistent
  //using localStorage
  (function fetchPersistentConfig(){
    var conf = JSON.parse(localStorage.getItem('config'));
    if(conf){
      for(i in conf){
        config[i] = conf[i];
      }
    }
  })();
  /** 
   * Canonical function to abstract working of config
   */
  function _get(key) {
    //if key is direct (usual case)
    if(key.indexOf('.')<0)
      return config[key];
    //if key is hidden inside some place
    //so key is something like "radioSettings.capital.url"
    var keys = key.split('.');
    var conf = config;
    //this will loop something like :
    //conf=conf['radioSettings']
    //conf=conf['capital']
    //conf=conf['url']
    //and finally return the requested key
    for(i in keys){
      conf = conf[keys[i]];
    }
    return conf;
  };
  /**
   * Set a key in the config
   * If the key is persistent, it is saved across to 
   * localStorage for persistence as well
   * from where it is retreived on next run
   */
  function _set(key, value, per) {
    per = per||false;
    if(key.indexOf('.')<0){
      config[key] = value;
    }
    else{
      //they key is nested
      var keys=key.split('.');
      //a.b.c.d=value => {a:{b:{c:{d:value}}}}
      for (var i = 0, tmp = config; i < keys.length - 1; i++) {
         tmp = tmp[keys[i]] = {};
      }
      tmp[keys[i]] = value;
    }
    //if key is persistent and it's not already in the persistent list
    if(per && persistent.indexOf(key)<0)
      persistent.push(key);
    //we update the localStorage config as well
    //if the key was persistent
    if(persistent.indexOf(key)>-1){
      //create a new object with persistent stuff only
      var obj = {};
      for(i in persistent){
        var key = persistent[i];
        obj[key] = config[key];
      }
      localStorage.setItem('config',JSON.stringify(obj));
    }
  };
  /** 
   * Clear localStorage
   * while making sure that persistent
   * config is not affected
   */
  function _clear(){
    localStorage.clear();
    localStorage.setItem('config',JSON.stringify(config));
  }
  return {
    get:_get,
    set:_set,
    clearLS:_clear
  };
};