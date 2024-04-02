<script setup lang="ts">

</script>

<template>
<nav class="c-navbar" role="navigation" aria-label="main navigation">
    <div id="navbarBasicExample" class="c-navbar__navbar-menu">
        <div class="c-navbar__navbar-options">
            <a class="c-navbar__navbar-item" href="/telos-cloud-no-creation">
                Telos Cloud
            </a>
            <a class="c-navbar__navbar-item" href="/telos-cloud-redirect">
                Telos Cloud Redirect
            </a>
        </div>
    </div>
</nav>
</template>

<style lang="scss">
.c-navbar {
    background-color: #f5f5f5;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
    &__navbar-menu {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }
    &__navbar-options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
    }
    &__navbar-item {
        text-decoration: none;
        color: #363636;
        font-size: 16px;
        font-weight: 500;
    }
}
    
</style>
