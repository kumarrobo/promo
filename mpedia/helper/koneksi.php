<?php
// source code by ilman sunanuddin
// documentasi https:/m-pedia.id
$host = "localhost";
$username = "root";
$password = "PrgMNA7FupnH1eij";
$db = "wa_db";
error_reporting(0);
$koneksi = mysqli_connect($host, $username, $password, $db) or die("GAGAL");

$base_url = "http://192.168.0.3/mpedia/";
date_default_timezone_set('Asia/Jakarta');
