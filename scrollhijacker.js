/**
 Hijack touch and mousewheel events to trigger slide transitions on carousel. This takes over the whole page while
the swiper controls doesn't. 

Scroll down, release control, scroll up, reverse slider, sroll back down operations. 

jrobens@interlated.com.au 201503

*/


function SwiperManager() {
    this.swiper = null;
    this.delta = 0;
    this.touchDelta = 0;
    this.touchStartY = 0; // Don't care about the X direction.
    this.touchStartTime = null;
    this.inSwiperDelta = 0;
    this.scrollThreshold = 5;
    this.slideSpeed = 1000;
    this.hasMouseWheelControl = true;
    this.transitioning = false;
}

SwiperManager.prototype.createSwiper = function () {
    var myself = this;

    this.swiper = new Swiper('.swiper-container-vertical', {
        pagination: '.swiper-pagination',
        direction: 'vertical',
        slidesPerView: 1,
        paginationClickable: true,
        spaceBetween: 0,
        mousewheelControl: false, // using our own.
        onlyExternal: true, // using our own
        effect: 'slide',
        speed: 1000, // ignore this value.
        autoplay: 0,
        grabCursor: false
    });

    // this.scrollThreshold = this.swiper.height / 7;
};


// Ignore mousewheelevent if after slideshow.
SwiperManager.prototype.atEnd = function () {
    // Gone to the end of the swiper and a little bit more.
    // Can scroll to negative in order to grab control again. It will be 0 unless we do scrollTo at the start.
    if (window.swiperManager.swiper.isEnd) {
        // In this case the wheelDelta will be 0. Count how long since we reached the end of the swiper.
        window.swiperManager.inSwiperDelta++;
        if (window.swiperManager.inSwiperDelta > 0) {
            window.swiperManager.hasMouseWheelControl = false;
            throw "At end";
        }
    } else {
        window.swiperManager.inSwiperDelta = 0;
    }
};

// Could be a timer if flag variables bother you.
SwiperManager.prototype.ignoreWhileTransitioning = function () {
    if (window.swiperManager.transitioning) {
        throw "transitioning";
    }
};

// Run with a timer.
SwiperManager.prototype.setNotTransitioning = function () {
    window.swiperManager.transitioning = false;
};

// Gains control, so should trap mousewheel event.
SwiperManager.prototype.checkNegativeDeltas = function () {
    // Delta is negative. Probably reloaded and  started at the bottom of the page.
    // Trigger must be smaller than scrollThreshold.
    if (window.swiperManager.delta < -3 && jQuery(window).scrollTop() > 0) {
        window.swiperManager.hasMouseWheelControl = false;
        throw "Gone past our 'top'";
    }
};

// Take control again at the top.
SwiperManager.prototype.checkAtTop = function () {
    // Reached the top of the page. Grab control again.
    // Will only run on negative due to isEnd check.
    if (jQuery(window).scrollTop() <= 0 && !window.swiperManager.hasMouseWheelControl) {
        //console.log("Going backwards in slides because it looks like we are at the top.");
        window.swiperManager.hasMouseWheelControl = true;
        window.swiperManager.delta = 0;
    }
};

SwiperManager.prototype.scrollUp = function (e) {
    if (!window.swiperManager.hasMouseWheelControl) {
        return;
    }

    if (Math.abs(window.swiperManager.delta) >= window.swiperManager.scrollThreshold) {
        window.swiperManager.delta = 0;
        window.swiperManager.transitioning = true;
        window.swiperManager.swiper.slidePrev(true, window.swiperManager.slideSpeed);
        setTimeout(function () {
            window.swiperManager.setNotTransitioning();
        }, window.swiperManager.slideSpeed);
    }
};

SwiperManager.prototype.scrollDown = function (e) {
    if (!window.swiperManager.hasMouseWheelControl) {
        return;
    }

    if (window.swiperManager.delta >= window.swiperManager.scrollThreshold) {
        window.swiperManager.delta = 0;
        window.swiperManager.transitioning = true;
        window.swiperManager.swiper.slideNext(true, window.swiperManager.slideSpeed);
        setTimeout(function () {
            window.swiperManager.setNotTransitioning();
        }, window.swiperManager.slideSpeed);
    }
};


SwiperManager.prototype.goingUp = function () {
    // Let the exceptions go through.
    window.swiperManager.checkNegativeDeltas();
    window.swiperManager.checkAtTop(); // should run through and cause 'scrollUp' if we are at the top.

    if (!window.swiperManager.hasMouseWheelControl) {
        throw "No mouse control";
    }

    jQuery('#home_swiper').trigger('swiperM:scrollUp');
};

SwiperManager.prototype.goingDown = function () {
    // Let exception go through.
    window.swiperManager.atEnd();
    jQuery('#home_swiper').trigger('swiperM:scrollDown');
};


SwiperManager.prototype.doTouchStart = function (e) {
    try {
        window.swiperManager.ignoreWhileTransitioning();
    } catch (err) {
        e.preventDefault();
        return false; // we are transitioning. Scrolljack.
    }

    if (!window.swiperManager.hasMouseWheelControl) {
        return;
    }

    window.swiperManager.touchDelta = 0;
    var touchobj = e.originalEvent.changedTouches[0];
    window.swiperManager.touchStartY = touchobj.pageY;
    window.swiperManager.touchStartTime = new Date().getTime();

    e.preventDefault();
};

SwiperManager.prototype.doTouchEnd = function (e) {
    try {
        window.swiperManager.ignoreWhileTransitioning();
    } catch (err) {
        e.preventDefault();
        return false; // we are transitioning. Scrolljack.
    }

    var touchobj = e.originalEvent.changedTouches[0];
    var distY = touchobj.pageY - window.swiperManager.touchStartY;
    var elapsedTime = new Date().getTime() - window.swiperManager.touchStartTime;

    if (distY > 0) {
        // Page scrolling up (swiping down).
        window.swiperManager.delta += window.swiperManager.scrollThreshold;
        try {
            window.swiperManager.goingUp();
        } catch (err) {
            // Bail out of scroll jacking.
            return;
        }
    }

    if (distY < 0) {
        // Page scrolling down (swiping up).
        window.swiperManager.delta += window.swiperManager.scrollThreshold;
        try {
            window.swiperManager.goingDown();
        } catch (err) {
            return;
        }
    }

    e.preventDefault();
};

SwiperManager.prototype.doTouchMove = function (e) {
    try {
        window.swiperManager.ignoreWhileTransitioning();
    } catch (err) {
        e.preventDefault();
        return false; // we are transitioning. Scrolljack.
    }

    if (!window.swiperManager.hasMouseWheelControl) {
        return;
    }

    e.preventDefault();
};


// this is window. Using local control as if you focus out of the slider it doesn't work.
SwiperManager.prototype.elementScroll = function (e) {
    // Don't hijack if all slides have been run.
    // var fromTop = jQuery(window).scrollTop();
    // console.log("delta is currently " + window.swiperManager.delta + " scrollthresh " + window.swiperManager.scrollThreshold + " from top " + fromTop + " control " + window.swiperManager.hasMouseWheelControl + " in swiper delta " + window.swiperManager.inSwiperDelta);

    // Either way ignore everything while transitioning.
    try {
        window.swiperManager.ignoreWhileTransitioning();
    } catch (err) {
        return false; // we are transitioning. Scrolljack.
    }

    // --- Scrolling up ---
    if (e.originalEvent.detail < 0 || e.originalEvent.wheelDelta > 0) {
        window.swiperManager.delta--;
        try {
            window.swiperManager.goingUp();
        } catch (err) {
            // Bail out of scroll jacking.
            return;
        }
    }

    // --- Scrolling down ---
    else {
        window.swiperManager.delta++;
        try {
            window.swiperManager.goingDown();
        } catch (err) {
            return;
        }
    }

    // Prevent page from scrolling. Not sure why we aren't doing e.preventDefault():
    return false;
};

jQuery(document).ready(function ($) {
    window.swiperManager = new SwiperManager();
    window.swiperManager.createSwiper();

    $(window).on({
        'DOMMouseScroll mousewheel': window.swiperManager.elementScroll,
        'touchstart': window.swiperManager.doTouchStart,
        'touchend': window.swiperManager.doTouchEnd,
        'touchmove': window.swiperManager.doTouchMove
    });

    var homeSwiper = $('#home_swiper');
    $(homeSwiper).on({
        'swiperM:scrollUp': window.swiperManager.scrollUp,
        'swiperM:scrollDown': window.swiperManager.scrollDown
    });
});
