$(() => {
    function addEventLike() {
        let t = document.getElementsByTagName("article");
        for (let i = 0; i < t.length; ++i) {
            let ele = t[i];
            let pid = $(ele).attr('pid');
            if (localStorage.getItem("post_like_" + pid)) {
                $('.icon-like', ele).addClass('iconfont-like-fill');
            }
        }
        $('.post-like-num').unbind("click", sendLike);
        $('.post-like-num').click(sendLike);
    }
    function addAtUsername() {
        $("article object .user.at.unfinish").each(function (e) {
            $.get('/api/user/info', { uid: this.getAttribute("uid") }, (dat) => {
                this.innerHTML = "@" + dat.msg.username;
                this.classList.remove("unfinish");
            })
        })
    }
    function sendLike() {
        let pid = this.parentElement.parentElement.parentElement.getAttribute("pid");
        if (pid == undefined) { return; }
        if (localStorage.getItem("post_like_" + pid)) { toast('info', '信息', '您已经点过赞了!'); return; }
        $.post('/api/post/sendfavor', { id: pid }, (dat) => {
            if (dat.status == 'error') { toast('error', '错误', '点赞失败'); console.log(err); }
            else {
                toast('success', '成功', '点赞成功');
                localStorage.setItem("post_like_" + pid, "1");
                this.innerHTML = this.innerHTML.replace(/\d+/g, parseInt(this.innerHTML.match(/\d+/g)[0]) + 1);
                this.childNodes[0].childNodes[0].classList.add('iconfont-like-fill');
            }
        });

    }

    addEventLike();
    addAtUsername();
    KaTeXReRender();
    $("#getMore a").click(function (e) {
        e.preventDefault();
        $("#getMore a").hide();
        $.ajax({
            url: $(this).attr('href'),
            type: "get",
            error: function (request) {
                alert('加载错误!请联系网站管理员！');
            },
            success: function (data) {
                var $result = $(data).find("#container article");
                $('#container').append($result.fadeIn(1000));
                addEventLike()
                KaTeXReRender();
                addAtUsername();
                if ($(data).find("#getMore a").attr('href') != undefined && $(data).find("#getMore a").attr('href') != "") {
                    $("#getMore a").show();
                    $("#getMore a").text('(｡・`ω´･)点我查看更多！');
                    $("#getMore a").attr('href', $(data).find("#getMore a").attr('href'));
                } else {
                    $("#getMore a").remove();
                    $("#getMore").html('<p>你已到达了世界的尽头(｡・`ω´･)！</p>');
                }
            }
        });
    })
})

function post(url, data, callback) {
    $.ajax({
        url: url, data: data, type: "post",
        error: function (request) { callback(request.msg); },
        success: function (data) {
            if (data.status == 'error') callback(data.msg);
            else callback(null, data);
        }
    });
}

function confirm(type, title, content, callback) {
    $.confirm({
        type: type, title: title, content: content, theme: 'supervan', useBootstrap: false, draggable: false, backgroundDismiss: true, autoClose: 'close|10000',
        buttons: {
            tryAgain: { text: '确认', btnClass: 'btn-red', action: function () { callback(); return; } }, close: { text: '取消', action: function () { } }
        }
    });
}

function deletePost(pid) {
    confirm('red', '确认删除?', '', ()=>{
        post('/api/deletepost', { pid: pid }, (err, dat) => {
            if (err) toast('error', '删除失败', '请重试或联系管理员');
            else {
                toast('success', '删除成功', '地球上又少了一点东西');
                window.location.href = window.location.href;
            }
        })
    })
}