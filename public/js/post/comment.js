$(() => {
    let template = `
<% function delta(time){var interval=new Date().getTime()-time;var returnTime="";var years=Math.floor(interval/(365*24*3600*1000));if(years==0){var months=Math.floor(interval/(30*24*3600*1000));if(months==0){var days=Math.floor(interval/(24*3600*1000));if(days==0){var leaveTime=interval%(24*3600*1000);var hours=Math.floor(leaveTime/(3600*1000));if(hours==0){leaveTime=leaveTime%(3600*1000);var minutes=Math.floor(leaveTime/(60*1000));if(minutes==0){leaveTime=leaveTime%(60*1000);var seconds=Math.round(leaveTime/1000);return seconds+"秒前"}return minutes+"分钟前"}return hours+"小时前"}return days+"天前"}return months+"月前"}return years+"年前"} %> 
<div class="comment-item">
    <div class="comment-avatar">
        <img class="avatar" src="https://kana-1252071452.cos.ap-shanghai.myqcloud.com/img/user/avatar/<%= dat.uid %>.webp!50x50" height="48px" width="48px">
    </div>
    <div class="comment-info">
        <span class="comment-author-info">
            <a class="comment-author" href="/user/<%= dat.uid %>" uid="<%= dat.uid %>"><%= dat.username %></a>
            <i class="iconfont"></i>
        </span>
        <p><%= dat.comment %></p>
        <div class="comment-toolbar">
            <span class="comment-time"><%= delta(dat.created) %></span>
        </div>
    </div>
</div>
`

    let pages = 0;

    function updatePageNavi(page) {
        let h = `<li class="page-item"><a class="page-link" href="#write-comment">Previous</a></li>`;
        const show = 3;
        h += '<li class="page-item ' + (page == 1 ? "active" : "") + '"><a class="page-link" href="#write-comment">1</a></li>';
        if (page - show + 1 > 1) h += '<li class="page-item"><a class="page-link" href="#write-comment">...</a></li>';
        for (let i = page - show + 1; i <= page && i < pages; ++i) {
            if (i <= 1) continue;
            h += '<li class="page-item ' + (page == i ? "active" : "") + '"><a class="page-link" href="#write-comment">' + i + '</a></li>';
        }
        for (let i = page + 1; i < page + show && i < pages; ++i) {
            if (i <= 1) continue;
            h += '<li class="page-item"><a class="page-link" href="#write-comment">' + i + '</a></li>';
        }
        if (page + show <= pages) h += '<li class="page-item"><a class="page-link" href="#write-comment">...</a></li>';
        if (pages != 1) h += '<li class="page-item ' + (page == pages ? "active" : "") + '"><a class="page-link" href="#write-comment">' + pages + '</a></li>';
        h += '<li class="page-item"><a class="page-link" href="#write-comment">Next</a></li>';
        $(".pagination")[0].innerHTML = h;
        $(".pagination .page-link").smoothScroll({});
        $(".pagination .page-link").click(function () {
            if (!isNaN(Number(this.innerHTML))) {
                get(Number(this.innerHTML));
            }else {
                if (!isNaN($(".page-item.active .page-link")[0].innerHTML)){
                    let page = Number($(".page-item.active .page-link")[0].innerHTML) + (this.innerHTML=="Previous" ? -1 : 1);
                    if(page<=0) return ;
                    get(page);
                }
            }
        })
    }

    function get(page, parent = 0) {
        $.ajax({
            type: "get",
            url: "/api/comment",
            data: { pid: $(".comment-container").attr('pid'), page: page, parent: parent },
            dataType: "json",
            success: function (res) {
                if(res.status == "error") return;
                $(".comment-container .comment")[0].innerHTML = "";
                res.dat.forEach(dat => {
                    dat.created = new Date(dat.created);
                    dat.modified = new Date(dat.modified);
                    $(ejs.render(template, { dat: dat })).appendTo(".comment-container .comment");
                });
                updatePageNavi(page);
            }
        });
    }

    function updatePages() {
        $.ajax({
            type: "get",
            url: "/api/commentAmount",
            data: { pid: $(".comment-container").attr('pid'), parent: 0 },
            dataType: "json",
            success: function (res) {
                pages = Math.ceil(res.dat / 10);
                if (pages == 0) {
                    var dat = { uid: 1, username: "admin", created: new Date(), comment: "还没有评论呢~~" };
                    $(ejs.render(template, { dat: dat })).appendTo(".comment-container .comment");
                } else {
                    get(1);
                    updatePageNavi(1);
                }
            }
        });
    }
    updatePages();

    function send() {
        let comment = $(".comment-textarea")[0].value;
        if (comment.length < 1 || comment.length >= 1000) {
            toast('error', '发送失败', '内容长度不符合规范');
            return;
        }
        $.ajax({
            type: "post",
            url: "/api/comment",
            data: { pid: $(".comment-container").attr('pid'), parent: 0, comment: comment },
            dataType: "json",
            success: function (res) {
                if (res.status == 'success') {
                    $(".comment-textarea")[0].value = "";
                    toast('success', '发送成功');
                    updatePages();
                } else toast('error', '发送失败', res.msg);
            }
        });
    }

    $(".comment-button").click(() => { send() });
})