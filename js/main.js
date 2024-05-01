function EscHtml(string){
    return string.replace(/&/g, '&lt;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, "&#x27;");
}

function getTextByte(text) {
    var blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    return blob.size;
}

function gen_OneTimeText() {
    var currentTime = new Date();
    var minute = currentTime.getMinutes();
    var randomString = gen_Random_Text(minute);
    return randomString;
}

function gen_Random_Text(seed) {
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var length = 32;
    if(seed == null || seed == ''){
        length = 128;
        Math.seedrandom();
    }else{
        Math.seedrandom(seed.toString());
    }
    var randomString = '';
    for (var i = 0; i < length; i++) {
        randomString += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return randomString;
}

var text = "";
var des = "";

var cnt = 0;
function nijimemo_share(text){
    if($('#qrcode').children().length){
        $('#qrcode').children().remove();
    }

    if(!(text == null || text == '')){
        cnt = 0;
        var encrypt_key = gen_OneTimeText();

        text = URLCompressor.compress(text);
        des = CryptoJS.AES.encrypt(text, encrypt_key);
    }
    var enc_text = String(des);
    var enc_text_list = enc_text.match(/.{1,128}/g);
    
    if(cnt >= enc_text_list.length){
        text = "";
        des = "";
        encrypt_key = "";
        cnt = 0;
        return 0;
    }else{
        var data = {
            all: enc_text_list.length,
            now: enc_text_list.indexOf(enc_text_list[cnt])+1,
            data: enc_text_list[cnt],
        };
        json_data = JSON.stringify(data);
        new QRCode($('#qrcode').get(0), json_data);
        cnt ++;
    }
    
};

//QR読み取り-------------------------
var start_read = null;
var readstop = null;

function nijimemo_qr_read(){
    var qr_list = [];

    if(start_read === true){
        start_read = false;
        readstop = true;

        $("#color_bar").show();
        $("#canvas").hide();
    }else{
        start_read = true;
        readstop = false;

        $("#color_bar").hide();
        $("#canvas").show();
    }
    
    var video  = document.createElement("video");
    var canvas = $("#canvas").get(0);
    var ctx    = canvas.getContext("2d");

    var userMedia = {video: {facingMode: "environment"}};
    navigator.mediaDevices.getUserMedia(userMedia).then((stream)=>{
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
    });

    var decrypt_key = "";

    var readloop = function(){
        if(video.readyState === video.HAVE_ENOUGH_DATA){
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var code = jsQR(img.data, img.width, img.height, {inversionAttempts: "dontInvert"});
            if(code){
                if(decrypt_key == ""){
                    decrypt_key = gen_OneTimeText();
                }

                code.data;

                parse_json = JSON.parse(code.data);

                $("#now_num").html(parse_json.now+"/"+parse_json.all);

                if(parse_json.now == parse_json.all){
                    qr_list[qr_list.length] = code.data;
                    clearTimeout(loop);
                    video.srcObject.getTracks().forEach(track => track.stop());
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    start_read = false;
                    readstop = true;

                    $("#color_bar").show();
                    $("#canvas").hide();

                    $("#read").removeClass("rec");
                    $("#read").html("Read");
                    read = false;

                    decode_code(qr_list,decrypt_key);

                    $("#now_num").html("0/X");

                }else{
                    qr_list[qr_list.length] = code.data;
                }
            }
            if(readstop === true){
                clearTimeout(loop);
                video.srcObject.getTracks().forEach(track => track.stop());
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }
    var loop = setInterval(readloop, 16);

    function decode_code(qr_list,decrypt_key){
        var qr_list = Array.from(new Set(qr_list));
        
        var qr_enc_data = "";
        for (var qr_datas of qr_list) {
            var one_qr_json = JSON.parse(qr_datas);
            
            qr_enc_data = qr_enc_data + one_qr_json.data;
        }

        var err = null;
        try{
            var decrypted = CryptoJS.AES.decrypt(qr_enc_data, decrypt_key);
            var decrypt = decrypted.toString(CryptoJS.enc.Utf8);
        }catch(e){
            err = true;
        }
        if(err == true || decrypt == ""){
            $(".err").html("暗号化の解除に失敗しました");
            $(".err").show();
            window.setTimeout(function(){
                $(".err").hide();
            }, 5000);
        }else if(err == null){
            $(".window").addClass("slideUp");
            $(".window").removeClass("slideDown");
            $(".window").show();
            $('.modal').show();

            $(".qr_window").hide();

            $('#save').off('click'); 
            $("#save").on('click', function() {
                nijimemo_save("",$("#textarea").val());

                $(".window").addClass("slideDown");
                $(".window").removeClass("slideUp");
                window.setTimeout(function(){
                    $(".modal").hide();
                }, 150);

                $("#textarea").val("");
            });
            $('#cancel').off('click'); 
            $("#cancel").on('click', function() {
                $(".window").addClass("slideDown");
                $(".window").removeClass("slideUp");
                window.setTimeout(function(){
                    $(".modal").hide();
                }, 150);
                $("#textarea").val("");
            });

            $("#textarea").html(EscHtml(URLCompressor.expand(decrypt)));
        }

        return 0;
    }
};

function nijimemo_save(title,text){

    var key = $.cookie('nijimemo_key');
    if(key == null || key == ''){
        key = gen_Random_Text();
        $.cookie(
            'nijimemo_key',
            key,
            {
                expires: 365, 
                path: '/',
                samesite: 'Strict',
                priority: 'High',
                secure: true
            }
        );
    }else{
        $.cookie(
            'nijimemo_key',
            key,
            {
                expires: 365, 
                path: '/',
                samesite: 'Strict',
                priority: 'High',
                secure: true
            }
        );
    }

    var date = new Date();
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    var h = ('0' + date.getHours()).slice(-2);
    var min = ('0' + date.getMinutes()).slice(-2);
    var s = ('0' + date.getSeconds()).slice(-2);
    var now = y + '/' + m + '/' + d + ' ' + h + ':' + min + ':' + s;

    if(localStorage.hasOwnProperty("memo")){
        var get_data = JSON.parse(window.localStorage.getItem("memo"));
        var id = get_data.Data.length > 0 ? get_data.Data[get_data.Data.length - 1].id + 1 : 1;
    } else {
        var get_data = { "Data": [] };
        var id = 1;
    }
    
    var encrypt_title = CryptoJS.AES.encrypt(URLCompressor.compress(title), key).toString();
    var encrypt_text = CryptoJS.AES.encrypt(URLCompressor.compress(text), key).toString();
    
    var newData = {
        "id": id,
        "date": now,
        "title": encrypt_title,
        "text": encrypt_text
    };
    
    get_data.Data.push(newData);
    
    var json = JSON.stringify(get_data);
    window.localStorage.setItem("memo", json);

    if (title == '') {
        title = "無題";
    }

    var main_Text = EscHtml(text).replace(/\r?\n/g, '<br>');
    if(main_Text.length > 256){
        main_Text = main_Text.substring(0, 256) + "…";
    }

    $('.read_zone').prepend('<div class="memo" id="'+id+'"><h1>'+EscHtml(title)+'</h1><p>'+ main_Text +'</p><div class="p2">'+now+'</div></div>');
}

function nijimemo_read(){
    var key = $.cookie('nijimemo_key');
    if(key == null || key == ''){
        $('.read_zone').append('<div class="error">メモの鍵が見つかりません。</div>');
    }else{
        $.cookie(
            'nijimemo_key',
            key,
            {
                expires: 365, 
                path: '/',
                samesite: 'Strict',
                priority: 'High',
                secure: true
            }
        );
    }

    var all_memo_json = [];

    if(localStorage.hasOwnProperty("memo")){
        var get_data = JSON.parse(window.localStorage.getItem("memo"));
        for (var memo of get_data.Data) {
            try {
                var decrypt_text = CryptoJS.AES.decrypt(memo.text, key).toString(CryptoJS.enc.Utf8);
                var decrypt_title = CryptoJS.AES.decrypt(memo.title, key).toString(CryptoJS.enc.Utf8);
            } catch (e) {
                return "メモの暗号化を解除できませんでした";
            }
            var de_comp_data = {
                id: memo.id,
                title: URLCompressor.expand(decrypt_title),
                text: URLCompressor.expand(decrypt_text),
                date: memo.date
            };
            all_memo_json.push(de_comp_data);
        }
    }

    for (var json_memo of all_memo_json.reverse()) {
        if (json_memo) {
            if (json_memo.title == '') {
                json_memo.title = "無題";
            }
            if (json_memo.text == '') {
                json_memo.text = "";
            }
            var main_Text = EscHtml(json_memo.text).replace(/\r?\n/g, '<br>');
            if(main_Text.length > 256){
                main_Text = main_Text.substring(0, 256) + "…";
            }
            $('.read_zone').append('<div class="memo" id="' + json_memo.id + '"><h1>' + EscHtml(json_memo.title) + '</h1><p>' + main_Text + '</p><div class="p2">' + json_memo.date + '</div></div>');
        } else {
            $('.read_zone').append('<div class="error">鍵かメモのデータが破損しています。</div>');
            return "鍵かメモのデータが破損しています。";
        }
    }

    if(all_memo_json.length == 0){
        $('.read_zone').append('<div class="error">メモはありません。</div>');
    }
    return 0;
}

function nijimemo_get_memo(ids,val){
    var key = $.cookie('nijimemo_key');
    if(key == null || key == ''){
        return 'メモの鍵が見つかりません。';
    }else{
        $.cookie(
            'nijimemo_key',
            key,
            {
                expires: 365, 
                path: '/',
                samesite: 'Strict',
                priority: 'High',
                secure: true
            }
        );
    }

    var get_data = JSON.parse(window.localStorage.getItem("memo"));
    if(!(key == null || key == '')){
        try {
            var memo = get_data.Data.find(({ id }) => id == ids);
            if (memo) {
                try {
                    var decrypt_text = CryptoJS.AES.decrypt(memo.text, key).toString(CryptoJS.enc.Utf8);
                    var decrypt_title = CryptoJS.AES.decrypt(memo.title, key).toString(CryptoJS.enc.Utf8);
                } catch (e) {
                    return "メモの暗号化を解除できませんでした";
                }
                var de_comp_data = {
                    id: memo.id,
                    title: URLCompressor.expand(decrypt_title),
                    text: URLCompressor.expand(decrypt_text),
                    date: memo.date
                };

                if (val == "title") {
                    return de_comp_data.title || "無題";
                } else if (val == "text") {
                    return de_comp_data.text || "";
                } else if (val == "date") {
                    return de_comp_data.date || "";
                } else {
                    return 0;
                }
            } else {
                return "メモがありません";
            }
        } catch (e) {
            return "鍵かメモのデータが破損しています。";
        }
    }
}


function nijimemo_overwrite_save(id,title,text){
    var key = $.cookie('nijimemo_key');
    if(key == null || key == ''){
        return 'メモの鍵が見つかりません。';
    }else{
        $.cookie(
            'nijimemo_key',
            key,
            {
                expires: 365, 
                path: '/',
                samesite: 'Strict',
                priority: 'High',
                secure: true
            }
        );
    }

    var date = new Date();
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    var h = ('0' + date.getHours()).slice(-2);
    var min = ('0' + date.getMinutes()).slice(-2);
    var s = ('0' + date.getSeconds()).slice(-2);
    var now = y + '/' + m + '/' + d + ' ' + h + ':' + min + ':' + s;

    var get_data = JSON.parse(window.localStorage.getItem("memo"));

    var encrypt_title = CryptoJS.AES.encrypt(URLCompressor.compress(title), key).toString();
    var encrypt_text = CryptoJS.AES.encrypt(URLCompressor.compress(text), key).toString();

    var memochk = null;
    for (var i = 0; i < get_data.Data.length; i++) {
        if (get_data.Data[i].id == id) {
            get_data.Data[i].title = encrypt_title;
            get_data.Data[i].text = encrypt_text;
            get_data.Data[i].date = now;
            memochk = true;
            break;
        }
    }
    if(!(memochk == true)){
        return 'メモが見つかりませんでした。';
    }
    
    var json = JSON.stringify(get_data);
    window.localStorage.setItem("memo", json);

    var main_Text = EscHtml(text).replace(/\r?\n/g, '<br>');
    if(main_Text.length > 256){
        main_Text = main_Text.substring(0, 256) + "…";
    }
    $('.read_zone').children('#'+id).html('<h1>' + EscHtml(title) + '</h1><p>' + main_Text + '</p><div class="p2">' + now + '</div>');

    return 0;
}

function nijimemo_delete_memo(id){
    var key = $.cookie('nijimemo_key');
    if(key == null || key == ''){
        return 'メモの鍵が見つかりません。';
    }else{
        $.cookie(
            'nijimemo_key',
            key,
            {
                expires: 365, 
                path: '/',
                samesite: 'Strict',
                priority: 'High',
                secure: true
            }
        );
    }

    var get_data = JSON.parse(window.localStorage.getItem("memo"));

    var memochk = null;
    for (var i = 0; i < get_data.Data.length; i++) {
        if (get_data.Data[i].id == id) {
            get_data.Data.splice(i, 1);
            memochk = true;
            break;
        }
    }
    if(!(memochk == true)){
        return 'メモが見つかりませんでした。';
    }
    
    var json = JSON.stringify(get_data);
    window.localStorage.setItem("memo", json);

    $('.read_zone').children('#'+id).remove();

    return 0;
}