$(() => {
    var userlevel = new Map();
    var userlevellist = new Map();
    var template = `
    <% function dateFtt(fmt,date){var o={"M+":date.getMonth()+1,"d+":date.getDate(),"h+":date.getHours(),"m+":date.getMinutes(),"s+":date.getSeconds(),"q+":Math.floor((date.getMonth()+3)/3),"S":date.getMilliseconds()};if(/(y+)/.test(fmt))fmt=fmt.replace(RegExp.$1,(date.getFullYear()+"").substr(4-RegExp.$1.length));for(var k in o)if(new RegExp("("+k+")").test(fmt))fmt=fmt.replace(RegExp.$1,(RegExp.$1.length==1)?(o[k]):(("00"+o[k]).substr((""+o[k]).length)));return fmt} %>
    <% function delta(time){var interval=new Date().getTime()-time;var returnTime="";var years=Math.floor(interval/(30*24*3600*1000));if(years==0){var months=Math.floor(interval/(30*24*3600*1000));if(months==0){var days=Math.floor(interval/(24*3600*1000));if(days==0){var leaveTime=interval%(24*3600*1000);var hours=Math.floor(leaveTime/(3600*1000));if(hours==0){leaveTime=leaveTime%(3600*1000);var minutes=Math.floor(leaveTime/(60*1000));if(minutes==0){leaveTime=leaveTime%(60*1000);var seconds=Math.round(leaveTime/1000);return seconds+"秒前"}return minutes+"分钟前"}return hours+"小时前"}return days+"天前"}return months+"月前"}return years+"年前"} %> 

    <article class="<%= (art.type==0)?'shuoshuo':'blog' %> kana-item">
        <div class="post-info">
            <div class="post-info-author">
                <img class="avatar" src="https://kana-1252071452.cos.ap-shanghai.myqcloud.com/img/user/avatar/<%= art.user_id %>.webp!50x50" height="48px" width="48px">
                <a rel="author" href="/user/username/<%= art.user_name %>"><%= art.user_name %></a>
            </div>
            <div class="post-info-meta">
                <time title="<%= dateFtt("yyyy-MM-dd hh:mm:ss", art.created); %>"><%= delta(art.created); %></time>
            </div>
            <div class="post-info-content"><a><object><%- art.content %></object></a></div>
        </div>
    </article>
    `
    
    $.ajax({
        type: "post",
        url: "/api/template",
        data: {},
        dataType: "json",
        success: function (res) {
            if (res.status == "success") {
                template = res.msg;
            } else {
                toast('error', '模板获取失败', res.msg);
            }
        }
    });

    function edit(pid) {
        toast('info', '获取文章中')
        var thispid = pid;
        $.ajax({
            type: "post",
            url: "/api/getSourcePost",
            data: { pid: thispid },
            dataType: "json",
            success: function (res) {
                if (res.status == "success") {
                    toast('success', '获取成功')
                    res.msg = res.msg.replace(/\n/g, "<br>");
                    $("#writepost")[0].innerHTML = res.msg;
                    $("#writepost").attr('pid', thispid);
                } else {
                    toast('error', '获取失败', res.msg);
                }
            }
        });
    }

    function del(pid) {
        var thispid = pid;
        $.ajax({
            type: "post",
            url: "/api/deletepost",
            data: { pid: thispid },
            dataType: "json",
            success: function (res) {
                if (res.status == "success") {
                    toast('success', '删除成功')
                    res.msg = res.msg.replace(/\n/g, "<br>");
                    window.location.href = '/';
                } else {
                    toast('error', '删除失败', res.msg);
                }
            }
        });
    }
    
    function getPostAmount(pid){
        $.ajax({
            type: "get",
            url: "/api/commentAmount",
            data: {pid: pid, parent: -1},
            dataType: "json",
            success: function (res) {
                if(res.status == 'success')
                    $("article[pid="+pid+"] .post-toolbar .post-comment-num a")[0].innerHTML = '<i class="iconfont icon-comment"></i>' + res.dat;
            }
        });
    }

    function getMyCommentAmount(){
        $.ajax({
            type: "get",
            url: "/api/user/commentAmount",
            data: {},
            dataType: "json",
            success: function (res) {
                if(res.status = 'success')
                    $("#usercard-info-comment .num")[0].innerHTML = res.msg;
                else $("#usercard-info-comment .num")[0].innerHTML = 'ERR';
            }
        });
    }
    getMyCommentAmount();

    function getMyPostAmount(){
        $.ajax({
            type: "get",
            url: "/api/user/postAmount",
            data: {},
            dataType: "json",
            success: function (res) {
                if(res.status = 'success')
                    $("#usercard-info-shuoshuo .num")[0].innerHTML = res.msg;
                else $("#usercard-info-shuoshuo .num")[0].innerHTML = 'ERR';
            }
        });
    }
    getMyPostAmount();

    function rebuild() {
        var t = $(".post-info-author-username i");
        userlevellist = new Map();
        t.each(function () {
            var ele = this;
            getPostAmount($(ele.parentElement.parentElement.parentElement.parentElement).attr('pid'));
            if (!ele.parentElement.classList.contains("finished")) {
                var uname = ele.parentElement.children[0].innerText;
                if (userlevel[uname] == undefined) {
                    userlevellist[uname] = [ele];
                    userlevel[uname] = 0;
                    $.ajax({
                        type: "post",
                        url: "/api/user/level",
                        data: { uname: uname },
                        dataType: "json",
                        success: function (res) {
                            if (res.status == 'error') {
                                toast('error', '用户等级获取失败', res.msg);
                            } else {
                                userlevel[uname] = Number(res.msg);
                                userlevellist[uname].forEach(tmp=>{
                                    $(tmp).addClass('iconfont icon-level-' + res.msg);
                                    tmp.parentElement.classList.add("finished");
                                })
                            }
                        }
                    });
                }
                else {
                    if(userlevel[uname] != 0){
                        $(ele).addClass('iconfont icon-level-' + userlevel[uname]);
                        ele.parentElement.classList.add("finished");
                    } else {
                        userlevellist[uname].push(ele);
                    }
                }
            }
        })
        renderMathInElement(document.body,{
            delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false}]
        });
    }
    rebuild();
    function getSourcePost() {
        $("#getMore").attr('page', Number($("#getMore").attr('page')) + 1);
        $.ajax({
            type: "post",
            url: "/api/page",
            data: { page: $("#getMore").attr('page') },
            dataType: "json",
            success: function (res) {
                if (res.status == "success") {
                    toast('success', '获取成功', '渲染中');
                    if (res.dat.length < 10) {
                        $("#getMore")[0].innerHTML = "好像来到了世界的尽头";
                        $("#getMore").attr('disable', true);
                    }
                    res.dat.forEach(art => {
                        art.created = new Date(art.created);
                        art.modified = new Date(art.modified);
                        var t = $(ejs.render(template, { art: art })).appendTo("#container");
                        $(t).children("div.post-info").children("div.post-info-author").children("a.edit").smoothScroll({});
                        $(t).children("div.post-info").children("div.post-info-author").children("a.edit").click(function () {
                            edit($(this).attr('pid'));
                        });
                        $(t).children("div.post-info").children("div.post-info-author").children("a.delete").click(function () {
                            del($(this).attr('pid'));
                        });
                    });
                    rebuild();
                } else {
                    toast('error', '获取失败', res.msg);
                }
            }
        });
    }

    $("#getMore").click(() => {
        if ($("#getMore").attr('disable')) return;
        getSourcePost();
    })

    $("article .edit").click(function () {
        edit($(this).attr('pid'));
    });
    $("article .delete").click(function () {
        del($(this).attr('pid'));
    });
})